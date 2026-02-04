import { useState, useCallback } from "react";
import type { ProjectRow } from "../../types/project";
import type { KnitModel, StitchType } from "../../types/knitModel";
import { createDefaultKnitModel } from "../../core/cad/knitDefaults";
import { resizeKnitGrid } from "../../core/cad/knitUtils";
import KnitCanvas from "./KnitCanvas";
import { exportKnitBitmap, exportKnitJSON } from "../../core/export/exportKnit";
import { showError } from "../Toast";

const STITCHES: { id: StitchType; name: string; desc: string }[] = [
    { id: 0, name: "Knit", desc: "Solid loop" },
    { id: 1, name: "Tuck", desc: "Loop + hold" },
    { id: 2, name: "Miss", desc: "No loop" },
    { id: 3, name: "Float", desc: "Horizontal float" },
];

export default function KnitEditor({ project }: { project: ProjectRow }) {
    const [model, setModel] = useState<KnitModel>(() => {
        const stored = project.editorState?.model as KnitModel | undefined;
        if (stored && stored.grid) {
            // Reconstruct Uint8Array from stored data
            return {
                ...stored,
                grid: stored.grid instanceof Uint8Array
                    ? stored.grid
                    : new Uint8Array(Object.values(stored.grid as object)),
            };
        }
        return createDefaultKnitModel();
    });
    const [activeStitch, setActiveStitch] = useState<StitchType>(0);
    const [exporting, setExporting] = useState<"bitmap" | "json" | null>(null);

    const updateModel = useCallback((newModel: KnitModel) => {
        setModel(newModel);
        if (project.editorState) {
            project.editorState.model = newModel;
        }
    }, [project]);

    const handleCellClick = useCallback((x: number, y: number) => {
        setModel(prevModel => {
            const idx = y * prevModel.wales + x;
            const newGrid = new Uint8Array(prevModel.grid);
            newGrid[idx] = activeStitch;
            const newModel = { ...prevModel, grid: newGrid };
            // Also update project state for persistence
            if (project.editorState) {
                project.editorState.model = newModel;
            }
            return newModel;
        });
    }, [activeStitch, project.editorState]);

    const handleWalesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newWales = Math.max(4, Number(e.target.value) || 4);
        const newGrid = resizeKnitGrid(model.grid, model.wales, model.courses, newWales, model.courses);
        updateModel({ ...model, wales: newWales, grid: newGrid });
    }, [model, updateModel]);

    const handleCoursesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newCourses = Math.max(4, Number(e.target.value) || 4);
        const newGrid = resizeKnitGrid(model.grid, model.wales, model.courses, model.wales, newCourses);
        updateModel({ ...model, courses: newCourses, grid: newGrid });
    }, [model, updateModel]);

    const handleYarnColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newYarns = [...model.yarns];
        newYarns[0] = { ...newYarns[0], color: e.target.value };
        updateModel({ ...model, yarns: newYarns });
    }, [model, updateModel]);

    const isExporting = exporting !== null;

    const handleExportBitmap = useCallback(async () => {
        if (exporting) return;
        setExporting("bitmap");
        try {
            const dataUrl = exportKnitBitmap(model);
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `${project.name || "knit"}-stitches.png`;
            link.click();
        } catch (err) {
            console.error("[KnitEditor] Bitmap export failed:", err);
            showError("Failed to export stitch bitmap");
        } finally {
            setExporting(null);
        }
    }, [model, project.name, exporting]);

    const handleExportJSON = useCallback(async () => {
        if (exporting) return;
        setExporting("json");
        try {
            const json = exportKnitJSON(model);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${project.name || "knit"}-instructions.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("[KnitEditor] JSON export failed:", err);
            showError("Failed to export instructions JSON");
        } finally {
            setExporting(null);
        }
    }, [model, project.name, exporting]);

    return (
        <div style={{ display: "flex", gap: 24, padding: 16 }}>
            {/* Left controls */}
            <div style={{ minWidth: 200 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    🧶 Stitch Type
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {STITCHES.map((s) => (
                        <button
                            key={s.id}
                            className={activeStitch === s.id ? "btn btnPrimary" : "btn btnGhost"}
                            onClick={() => setActiveStitch(s.id)}
                            style={{ textAlign: "left", justifyContent: "flex-start" }}
                        >
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            <span style={{ marginLeft: 8, opacity: 0.7, fontSize: "0.8rem" }}>
                                {s.desc}
                            </span>
                        </button>
                    ))}
                </div>

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    📐 Grid Size
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                        <span style={{ width: 60 }}>Wales</span>
                        <input
                            type="number"
                            min={4}
                            max={200}
                            value={model.wales}
                            onChange={handleWalesChange}
                            style={{
                                width: 70,
                                padding: "4px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: 4,
                            }}
                        />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                        <span style={{ width: 60 }}>Courses</span>
                        <input
                            type="number"
                            min={4}
                            max={200}
                            value={model.courses}
                            onChange={handleCoursesChange}
                            style={{
                                width: 70,
                                padding: "4px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: 4,
                            }}
                        />
                    </label>
                </div>

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    🧵 Yarn Color
                </h3>
                <input
                    type="color"
                    value={model.yarns[0]?.color ?? "#111827"}
                    onChange={handleYarnColorChange}
                    style={{ width: 60, height: 32, cursor: "pointer", border: "1px solid #d1d5db" }}
                />

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    📤 Export
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                        className={`btn btnGhost ${exporting === "bitmap" ? "btn--loading" : ""}`}
                        onClick={handleExportBitmap}
                        disabled={isExporting}
                    >
                        {exporting === "bitmap" ? "Exporting..." : "Stitch Bitmap (PNG)"}
                    </button>
                    <button
                        className={`btn btnGhost ${exporting === "json" ? "btn--loading" : ""}`}
                        onClick={handleExportJSON}
                        disabled={isExporting}
                    >
                        {exporting === "json" ? "Exporting..." : "Instructions (JSON)"}
                    </button>
                </div>
            </div>

            {/* Right canvas */}
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    Knit Fabric Preview
                </h3>
                <div style={{
                    overflow: "auto",
                    maxHeight: "70vh",
                    background: "#f9fafb",
                    borderRadius: 8,
                    padding: 16,
                }}>
                    <KnitCanvas
                        model={model}
                        cell={12}
                        activeStitch={activeStitch}
                        onCellClick={handleCellClick}
                    />
                </div>
                <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#6b7280" }}>
                    Click cells to paint with selected stitch type • {model.wales}W × {model.courses}C
                </div>
            </div>
        </div>
    );
}
