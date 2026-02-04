import { useMemo, useRef, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { getProject, upsertProject } from "../core/storage/projectRepo";
import { exportProjectJson, importProjectJson } from "../core/export/projectBackup";
import { exportTilePNG, exportRepeatSheetPNG, exportColorwaySheetPNG } from "../core/export/exportPNG";
import { exportLineSheetPDF } from "../core/export/exportPDF";
import { useProjectStore } from "../store/useProjectStore";
import { showSuccess, showError } from "./Toast";

type ExportOperation =
    | "tile"
    | "repeat"
    | "linesheet"
    | "colorway"
    | "plates"
    | "digitalpack"
    | "backup"
    | null;

export default function ExportModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const projectId = useEditorStore((s) => s.projectId);
    const projectName = useEditorStore((s) => s.projectName);
    const repeatMode = useEditorStore((s) => s.repeatMode);
    const tileWidth = useEditorStore((s) => s.tileWidth);
    const tileHeight = useEditorStore((s) => s.tileHeight);
    const colorways = useEditorStore((s) => s.colorways);

    const refreshProjects = useProjectStore((s) => s.refresh);

    const [dpi, setDpi] = useState(300);
    const [exporting, setExporting] = useState<ExportOperation>(null);

    const importRef = useRef<HTMLInputElement | null>(null);

    const disabled = useMemo(() => !projectId, [projectId]);

    if (!open) return null;

    const isExporting = exporting !== null;

    // Helper to run export with loading state and error handling
    async function runExport<T>(
        operation: ExportOperation,
        fn: () => Promise<T>,
        successMessage?: string
    ): Promise<T | undefined> {
        if (isExporting) return;

        setExporting(operation);
        try {
            const result = await fn();
            if (successMessage) {
                showSuccess(successMessage);
            }
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Export failed";
            console.error(`[Export] ${operation} failed:`, err);
            showError(`Export failed: ${message}`);
            return undefined;
        } finally {
            setExporting(null);
        }
    }

    return (
        <div className="modalOverlay" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modalHeader">
                    <div>
                        <div className="modalTitle">Export</div>
                        <div className="modalSubtitle">
                            {projectId ? `Project: ${projectName}` : "Open a project to export"}
                        </div>
                    </div>

                    <button className="btn btnGhost" onClick={onClose} disabled={isExporting}>
                        Close
                    </button>
                </div>

                <div className="modalBody">
                    <div className="formGroup">
                        <label className="label">DPI</label>
                        <select
                            className="select"
                            value={dpi}
                            onChange={(e) => setDpi(Number(e.target.value))}
                            disabled={disabled || isExporting}
                        >
                            <option value={72}>72 (Screen)</option>
                            <option value={150}>150 (Medium)</option>
                            <option value={300}>300 (Print)</option>
                        </select>
                    </div>

                    <div className="hintCard">
                        <div className="hintTitle">Export Settings</div>
                        <div className="hintText">
                            Repeat Mode: <b>{repeatMode}</b> <br />
                            Tile: <b>{tileWidth} × {tileHeight}</b> px
                        </div>
                    </div>

                    <div className="exportGrid">
                        <button
                            className={`btn ${exporting === "tile" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting}
                            onClick={() => runExport("tile", () => exportTilePNG({ dpi }))}
                        >
                            {exporting === "tile" ? "Exporting..." : "Export Tile PNG"}
                        </button>

                        <button
                            className={`btn ${exporting === "repeat" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting}
                            onClick={() => runExport("repeat", () => exportRepeatSheetPNG({ dpi, grid: 3 }))}
                        >
                            {exporting === "repeat" ? "Exporting..." : "Export Repeat Sheet PNG (3×3)"}
                        </button>

                        <button
                            className={`btn btnGhost ${exporting === "linesheet" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting}
                            onClick={() => runExport("linesheet", () => exportLineSheetPDF({ dpi }))}
                        >
                            {exporting === "linesheet" ? "Exporting..." : "Export Line Sheet PDF"}
                        </button>

                        <button
                            className={`btn btnGhost ${exporting === "colorway" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting || colorways.length === 0}
                            onClick={() => runExport("colorway", () => exportColorwaySheetPNG({ dpi, r: 2, c: 3 }))}
                        >
                            {exporting === "colorway" ? "Exporting..." : `Export Colorway Sheet PNG (${colorways.length} variants)`}
                        </button>

                        <button
                            className={`btn btnGhost ${exporting === "plates" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting}
                            onClick={async () => {
                                if (!projectId) return;

                                const s = useEditorStore.getState();
                                const selected = s.layers.find((l: any) => l.id === s.selectedLayerId);

                                if (!selected?.reductionMeta) {
                                    showError("Plate Export requires a Reduced Layer.\n\n1. Select an image\n2. Use Production Tools -> Reduce Colors\n3. Select the NEW Reduced layer\n4. Come back here.");
                                    return;
                                }

                                await runExport("plates", async () => {
                                    const { exportSeparationPlatesZip } = await import("../core/export/exportSeparations");
                                    await exportSeparationPlatesZip({
                                        projectName: s.projectName,
                                        reducedLayerDataUrl: selected.src,
                                        reduction: selected.reductionMeta!,
                                        addRegistrationMarks: true,
                                    });
                                }, "Screen plates exported successfully!");
                            }}
                        >
                            {exporting === "plates" ? "Exporting..." : "Export Screen Plates ZIP"}
                        </button>

                        <button
                            className={`btn btnGhost ${exporting === "digitalpack" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting}
                            onClick={async () => {
                                if (!projectId) return;

                                const s = useEditorStore.getState();
                                const selected = s.layers.find((l: any) => l.id === s.selectedLayerId);

                                if (!selected?.reductionMeta) {
                                    showError("Please select a Reduced layer (generated from Production Tools) before exporting Digital Pack.");
                                    return;
                                }

                                await runExport("digitalpack", async () => {
                                    const { exportDigitalPackZip } = await import("../core/export/exportDigitalPack");
                                    await exportDigitalPackZip({
                                        projectName: s.projectName,
                                        reducedLayerDataUrl: selected.src,
                                        reduction: selected.reductionMeta,
                                        dpi,
                                        meta: {
                                            repeatMode: s.repeatMode,
                                            tileWidth: s.tileWidth,
                                            tileHeight: s.tileHeight,
                                        },
                                    });
                                }, "Digital pack exported successfully!");
                            }}
                        >
                            {exporting === "digitalpack" ? "Exporting..." : "Export Digital Pack ZIP"}
                        </button>

                        <button
                            className={`btn btnGhost ${exporting === "backup" ? "btn--loading" : ""}`}
                            disabled={disabled || isExporting}
                            onClick={async () => {
                                if (!projectId) return;

                                await runExport("backup", async () => {
                                    const project = await getProject(projectId);
                                    if (!project) {
                                        throw new Error("Project not found");
                                    }
                                    exportProjectJson(project);
                                }, "Project backup downloaded!");
                            }}
                        >
                            {exporting === "backup" ? "Exporting..." : "Backup Project (.json)"}
                        </button>

                        <input
                            ref={importRef}
                            type="file"
                            accept="application/json"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                try {
                                    const restored = await importProjectJson(file);
                                    await upsertProject(restored);
                                    await refreshProjects();
                                    showSuccess("Project imported successfully! Check Projects list.");
                                } catch (err) {
                                    const message = err instanceof Error ? err.message : "Unknown error";
                                    showError(`Failed to import project: ${message}`);
                                }

                                e.target.value = "";
                            }}
                        />

                        <button
                            className="btn btnGhost"
                            disabled={isExporting}
                            onClick={() => importRef.current?.click()}
                        >
                            Import Project (.json)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
