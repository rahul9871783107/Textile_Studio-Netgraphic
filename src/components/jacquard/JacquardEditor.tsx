import { useState, useMemo, useCallback, useRef } from "react";
import type { ProjectRow } from "../../types/project";
import type { JacquardModel } from "../../types/jacquardModel";
import { createDefaultJacquardModel } from "../../core/cad/jacquardDefaults";
import { imageToJacquardGrid } from "../../core/cad/jacquardFromImage";
import { getStructureStats } from "../../core/cad/jacquardDrawdown";
import { downloadJacquardBundle, exportJacquardBitmap, exportJacquardSimulation } from "../../core/export/exportJacquard";
import JacquardCanvas from "./JacquardCanvas";
import { showError } from "../Toast";

// Structure colors for legend
const STRUCTURE_COLORS = [
    "#f8fafc", // Plain - light
    "#3b82f6", // Twill - blue
    "#ef4444", // Satin - red
    "#22c55e", // Weft-faced - green
    "#f59e0b", // Warp-faced - amber
];

export default function JacquardEditor({ project }: { project: ProjectRow }) {
    // Initialize model from project or create default
    const [model, _setModel] = useState<JacquardModel>(() => {
        const saved = project.editorState?.jacquardModel as any;
        if (saved) {
            // Restore Uint8Array/Uint16Array from plain arrays
            return {
                ...saved,
                grid: new Uint16Array(saved.grid),
                structures: saved.structures.map((s: any) => ({
                    ...s,
                    threading: new Uint8Array(s.threading),
                    treadling: new Uint8Array(s.treadling),
                    tieUp: new Uint8Array(s.tieUp),
                })),
            } as JacquardModel;
        }
        return createDefaultJacquardModel();
    });

    const [selectedStructure, setSelectedStructure] = useState(0);
    const [showStructures, setShowStructures] = useState(true);
    const [brushSize, setBrushSize] = useState(1);
    const [version, setVersion] = useState(0);
    const [exporting, setExporting] = useState<"bitmap" | "simulation" | "bundle" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Statistics
    const stats = useMemo(() => getStructureStats(model), [model, version]);

    // Update model and save to project
    const updateModel = useCallback(() => {
        setVersion(v => v + 1);
        project.editorState = {
            ...project.editorState,
            jacquardModel: {
                ...model,
                grid: Array.from(model.grid),
                structures: model.structures.map(s => ({
                    ...s,
                    threading: Array.from(s.threading),
                    treadling: Array.from(s.treadling),
                    tieUp: Array.from(s.tieUp),
                })),
            },
        };
    }, [model, project]);

    // Handle cell click - paint with selected structure
    function handleCellClick(x: number, y: number) {
        const halfBrush = Math.floor(brushSize / 2);

        for (let dy = -halfBrush; dy <= halfBrush; dy++) {
            for (let dx = -halfBrush; dx <= halfBrush; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < model.width && ny >= 0 && ny < model.height) {
                    model.grid[ny * model.width + nx] = selectedStructure;
                }
            }
        }
        updateModel();
    }

    // Handle image import
    async function handleImageImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const dataUrl = reader.result as string;
                const grid = await imageToJacquardGrid(
                    dataUrl,
                    model.width,
                    model.height,
                    model.structures.length
                );
                model.grid = grid;
                model.sourceImage = dataUrl;
                updateModel();
            } catch (err) {
                console.error("[JacquardEditor] Failed to import image:", err);
                alert("Failed to import image. Please try again.");
            }
        };
        reader.readAsDataURL(file);
    }

    // Fill entire grid with selected structure
    function fillAllWithStructure() {
        model.grid.fill(selectedStructure);
        updateModel();
    }

    // Clear to plain weave
    function clearGrid() {
        model.grid.fill(0);
        updateModel();
    }

    // Export handlers
    const isExporting = exporting !== null;

    async function handleExportBundle() {
        if (isExporting) return;
        setExporting("bundle");
        try {
            await downloadJacquardBundle(model, project.name);
        } catch (err) {
            console.error("[JacquardEditor] Bundle export failed:", err);
            showError("Failed to export full bundle");
        } finally {
            setExporting(null);
        }
    }

    async function handleExportBitmap() {
        if (isExporting) return;
        setExporting("bitmap");
        try {
            const dataUrl = exportJacquardBitmap(model);
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `${project.name}-structure-map.png`;
            link.click();
        } catch (err) {
            console.error("[JacquardEditor] Bitmap export failed:", err);
            showError("Failed to export structure map");
        } finally {
            setExporting(null);
        }
    }

    async function handleExportSimulation() {
        if (isExporting) return;
        setExporting("simulation");
        try {
            const dataUrl = exportJacquardSimulation(model, 2);
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `${project.name}-simulation.png`;
            link.click();
        } catch (err) {
            console.error("[JacquardEditor] Simulation export failed:", err);
            showError("Failed to export simulation");
        } finally {
            setExporting(null);
        }
    }

    return (
        <div style={{ padding: 16, height: "100%", overflow: "auto" }}>
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#7c3aed" }}>
                        🎨 Jacquard CAD — {project.name}
                    </h2>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 4 }}>
                        {model.width}×{model.height} | {model.structures.length} structures |{" "}
                        {model.warpDensity} ends/cm × {model.weftDensity} picks/cm
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btnGhost" onClick={() => fileInputRef.current?.click()} disabled={isExporting}>
                        Import Artwork
                    </button>
                    <button
                        className={`btn btnGhost ${exporting === "bundle" ? "btn--loading" : ""}`}
                        onClick={handleExportBundle}
                        disabled={isExporting}
                    >
                        {exporting === "bundle" ? "Exporting..." : "Export All"}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleImageImport}
                    />
                </div>
            </div>

            {/* Structure Palette */}
            <div style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
            }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>
                    WEAVE STRUCTURES
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {model.structures.map((s, i) => {
                        const count = stats.get(s.id) ?? 0;
                        const pct = ((count / model.grid.length) * 100).toFixed(1);
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSelectedStructure(i)}
                                style={{
                                    padding: "8px 12px",
                                    border: selectedStructure === i ? "2px solid #7c3aed" : "1px solid #d1d5db",
                                    borderRadius: 6,
                                    background: STRUCTURE_COLORS[i % STRUCTURE_COLORS.length],
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: selectedStructure === i ? 600 : 400,
                                }}
                            >
                                {s.name}
                                <span style={{ fontSize: "0.7rem", color: "#6b7280", marginLeft: 6 }}>
                                    {pct}%
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tools */}
            <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                    Brush:
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        style={{ width: 80 }}
                    />
                    <span style={{ color: "#6b7280" }}>{brushSize}px</span>
                </label>

                <button className="btn btnGhost" onClick={fillAllWithStructure}>
                    Fill All
                </button>
                <button className="btn btnGhost" onClick={clearGrid}>
                    Clear
                </button>

                <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
                    <label style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={showStructures}
                            onChange={(e) => setShowStructures(e.target.checked)}
                            style={{ marginRight: 6 }}
                        />
                        Show Structures
                    </label>
                </div>
            </div>

            {/* Canvas Views */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                marginBottom: 24,
            }}>
                {/* Structure Map */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                        STRUCTURE MAP (Click to paint)
                    </div>
                    <div style={{ overflow: "auto", maxHeight: 500 }}>
                        <JacquardCanvas
                            model={model}
                            cellSize={4}
                            showStructures={true}
                            onCellClick={handleCellClick}
                        />
                    </div>
                </div>

                {/* Fabric Simulation */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                        FABRIC SIMULATION
                    </div>
                    <div style={{ overflow: "auto", maxHeight: 500 }}>
                        <JacquardCanvas
                            model={model}
                            cellSize={4}
                            showStructures={false}
                        />
                    </div>
                </div>
            </div>

            {/* Yarn Colors */}
            <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: "0.85rem", color: "#374151", fontWeight: 500, marginBottom: 8 }}>
                    Yarn Colors
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>
                        <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Warp</label>
                        <input
                            type="color"
                            value={model.warpColors[0] ?? "#1e3a5f"}
                            onChange={(e) => {
                                model.warpColors = Array(model.width).fill(e.target.value);
                                updateModel();
                            }}
                            style={{ display: "block", marginTop: 4, width: 48, height: 32, cursor: "pointer" }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Weft</label>
                        <input
                            type="color"
                            value={model.weftColors[0] ?? "#f5f5dc"}
                            onChange={(e) => {
                                model.weftColors = Array(model.height).fill(e.target.value);
                                updateModel();
                            }}
                            style={{ display: "block", marginTop: 4, width: 48, height: 32, cursor: "pointer" }}
                        />
                    </div>
                </div>
            </div>

            {/* Density Controls */}
            <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: "0.85rem", color: "#374151", fontWeight: 500, marginBottom: 8 }}>
                    Fabric Density
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                        Warp
                        <input
                            type="number"
                            min={10}
                            max={200}
                            value={model.warpDensity}
                            onChange={(e) => {
                                model.warpDensity = Number(e.target.value);
                                updateModel();
                            }}
                            style={{ width: 60, padding: 4 }}
                        />
                        ends/cm
                    </label>
                    <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                        Weft
                        <input
                            type="number"
                            min={10}
                            max={200}
                            value={model.weftDensity}
                            onChange={(e) => {
                                model.weftDensity = Number(e.target.value);
                                updateModel();
                            }}
                            style={{ width: 60, padding: 4 }}
                        />
                        picks/cm
                    </label>
                </div>
            </div>

            {/* Export Options */}
            <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: "0.85rem", color: "#374151", fontWeight: 500, marginBottom: 8 }}>
                    Export
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        className={`btn btnGhost ${exporting === "bitmap" ? "btn--loading" : ""}`}
                        onClick={handleExportBitmap}
                        disabled={isExporting}
                    >
                        {exporting === "bitmap" ? "Exporting..." : "Structure Map PNG"}
                    </button>
                    <button
                        className={`btn btnGhost ${exporting === "simulation" ? "btn--loading" : ""}`}
                        onClick={handleExportSimulation}
                        disabled={isExporting}
                    >
                        {exporting === "simulation" ? "Exporting..." : "Simulation PNG"}
                    </button>
                    <button
                        className={`btn btnGhost ${exporting === "bundle" ? "btn--loading" : ""}`}
                        onClick={handleExportBundle}
                        disabled={isExporting}
                    >
                        {exporting === "bundle" ? "Exporting..." : "Full Bundle"}
                    </button>
                </div>
            </div>

            {/* Help */}
            <div className="hintCard" style={{ marginTop: 24 }}>
                <div className="hintTitle">How to Use</div>
                <div className="hintText">
                    <ul style={{ margin: "8px 0 0 16px", lineHeight: 1.6 }}>
                        <li><strong>Import Artwork:</strong> Load an image to auto-convert to jacquard pattern</li>
                        <li><strong>Paint Structures:</strong> Select a structure, then click/drag on the map</li>
                        <li><strong>Simulation:</strong> See real-time fabric preview with your yarn colors</li>
                        <li><strong>Export:</strong> Get structure map (for CAM) and simulation (for preview)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
