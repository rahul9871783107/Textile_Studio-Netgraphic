import { useState, useCallback } from "react";
import type { ProjectRow } from "../../types/project";
import type { TuftModel } from "../../types/tuftModel";
import { createDefaultTuftModel } from "../../core/cad/tuftDefaults";
import TuftCanvas from "./TuftCanvas";
import { exportTuftColorMap, exportTuftJSON } from "../../core/export/exportTuft";
import { showError } from "../Toast";

export default function TuftEditor({ project }: { project: ProjectRow }) {
    const [model, setModel] = useState<TuftModel>(() => {
        const stored = project.editorState?.model as TuftModel | undefined;
        if (stored && stored.colorMap) {
            // Reconstruct Uint8Arrays from stored data
            return {
                ...stored,
                colorMap: stored.colorMap instanceof Uint8Array
                    ? stored.colorMap
                    : new Uint8Array(Object.values(stored.colorMap as object)),
                pileMap: stored.pileMap instanceof Uint8Array
                    ? stored.pileMap
                    : new Uint8Array(Object.values(stored.pileMap as object)),
                cutMap: stored.cutMap instanceof Uint8Array
                    ? stored.cutMap
                    : new Uint8Array(Object.values(stored.cutMap as object)),
            };
        }
        return createDefaultTuftModel();
    });

    const [exporting, setExporting] = useState<"colormap" | "json" | null>(null);

    const handleCellPaint = useCallback((x: number, y: number) => {
        setModel(prevModel => {
            const idx = y * prevModel.width + x;
            const newColorMap = new Uint8Array(prevModel.colorMap);
            const newPileMap = new Uint8Array(prevModel.pileMap);
            const newCutMap = new Uint8Array(prevModel.cutMap);

            newColorMap[idx] = prevModel.activeYarn;
            newPileMap[idx] = prevModel.activePile;
            newCutMap[idx] = prevModel.activeCut ? 1 : 0;

            const newModel = {
                ...prevModel,
                colorMap: newColorMap,
                pileMap: newPileMap,
                cutMap: newCutMap
            };

            if (project.editorState) {
                project.editorState.model = newModel;
            }

            return newModel;
        });
    }, [project.editorState]);

    const updateModel = useCallback((updates: Partial<TuftModel>) => {
        setModel(prev => {
            const newModel = { ...prev, ...updates };
            if (project.editorState) {
                project.editorState.model = newModel;
            }
            return newModel;
        });
    }, [project.editorState]);

    const handleYarnColorChange = useCallback((index: number, color: string) => {
        const newYarns = [...model.yarns];
        newYarns[index] = { ...newYarns[index], color };
        updateModel({ yarns: newYarns });
    }, [model.yarns, updateModel]);

    const isExporting = exporting !== null;

    const handleExportColorMap = useCallback(async () => {
        if (exporting) return;
        setExporting("colormap");
        try {
            const dataUrl = exportTuftColorMap(model);
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `${project.name || "carpet"}-colormap.png`;
            link.click();
        } catch (err) {
            console.error("[TuftEditor] Color map export failed:", err);
            showError("Failed to export color map");
        } finally {
            setExporting(null);
        }
    }, [model, project.name, exporting]);

    const handleExportJSON = useCallback(async () => {
        if (exporting) return;
        setExporting("json");
        try {
            const json = exportTuftJSON(model);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${project.name || "carpet"}-production.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("[TuftEditor] JSON export failed:", err);
            showError("Failed to export production JSON");
        } finally {
            setExporting(null);
        }
    }, [model, project.name, exporting]);

    return (
        <div style={{ display: "flex", gap: 24, padding: 16 }}>
            {/* Left controls */}
            <div style={{ minWidth: 220 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    🧵 Yarns
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {model.yarns.map((yarn, i) => (
                        <div key={yarn.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                type="color"
                                value={yarn.color}
                                onChange={(e) => handleYarnColorChange(i, e.target.value)}
                                style={{ width: 36, height: 28, cursor: "pointer", border: "1px solid #d1d5db" }}
                            />
                            <button
                                className={model.activeYarn === i ? "btn btnPrimary" : "btn btnGhost"}
                                onClick={() => updateModel({ activeYarn: i })}
                                style={{ flex: 1, fontSize: "0.8rem" }}
                            >
                                {yarn.name}
                            </button>
                        </div>
                    ))}
                </div>

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    📏 Pile Height
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                        type="range"
                        min={10}
                        max={100}
                        value={model.activePile}
                        onChange={(e) => updateModel({ activePile: Number(e.target.value) })}
                        style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "#6b7280", minWidth: 30 }}>
                        {model.activePile}
                    </span>
                </div>

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    ✂️ Cut / Loop
                </h3>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={model.activeCut}
                        onChange={(e) => updateModel({ activeCut: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: "0.85rem" }}>
                        {model.activeCut ? "Cut Pile (darker)" : "Loop Pile (lighter)"}
                    </span>
                </label>

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    📐 Grid Size
                </h3>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {model.width} × {model.height} needles
                </div>

                <h3 style={{ margin: "20px 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    📤 Export
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                        className={`btn btnGhost ${exporting === "colormap" ? "btn--loading" : ""}`}
                        onClick={handleExportColorMap}
                        disabled={isExporting}
                    >
                        {exporting === "colormap" ? "Exporting..." : "Color Map (PNG)"}
                    </button>
                    <button
                        className={`btn btnGhost ${exporting === "json" ? "btn--loading" : ""}`}
                        onClick={handleExportJSON}
                        disabled={isExporting}
                    >
                        {exporting === "json" ? "Exporting..." : "Production (JSON)"}
                    </button>
                </div>
            </div>

            {/* Right canvas */}
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#374151" }}>
                    Carpet Preview
                </h3>
                <div style={{
                    overflow: "auto",
                    maxHeight: "70vh",
                    background: "#f9fafb",
                    borderRadius: 8,
                    padding: 16,
                }}>
                    <TuftCanvas
                        model={model}
                        cell={8}
                        onCellPaint={handleCellPaint}
                    />
                </div>
                <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#6b7280" }}>
                    Click & drag to paint • Yarn {model.activeYarn + 1} • Pile {model.activePile} • {model.activeCut ? "Cut" : "Loop"}
                </div>
            </div>
        </div>
    );
}
