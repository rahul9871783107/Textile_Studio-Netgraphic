import { useState, useMemo, useCallback } from "react";
import type { ProjectRow } from "../../types/project";
import type { WeaveModel } from "../../types/weaveModel";
import { createDefaultWeaveModel, createTwillTieUp, createSatinTieUp } from "../../core/cad/weaveDefaults";
import { generateDrawdown, getDrawdownDimensions } from "../../core/cad/weaveDrawdown";
import { validateWeave } from "../../core/cad/weaveValidate";
import { apply2x2Twill, apply3x1Twill, applyBasket, applyHerringbone, applyDiamond, applyStraightDraw } from "../../core/cad/weaveGenerators";
import { downloadWIF } from "../../core/export/exportWIF";
import DrawdownCanvas from "./DrawdownCanvas";
import CADGrid from "../cad/CADGrid";
import { showError } from "../Toast";

// Threading grid component - shows harness assignment per warp end
function ThreadingGrid({
    model,
    onUpdate,
}: {
    model: WeaveModel;
    onUpdate: () => void;
}) {
    const grid = useMemo(() => {
        const g = new Uint16Array(model.warpCount * model.harnessCount);
        for (let x = 0; x < model.warpCount; x++) {
            const h = model.threading[x];
            if (h < model.harnessCount) {
                g[h * model.warpCount + x] = 1;
            }
        }
        return g;
    }, [model.threading, model.warpCount, model.harnessCount]);

    return (
        <CADGrid
            model={{
                width: model.warpCount,
                height: model.harnessCount,
                grid,
            }}
            cellSize={6}
            onCellClick={(x, y) => {
                model.threading[x] = y;
                onUpdate();
            }}
        />
    );
}

// Treadling grid component - shows treadle assignment per weft pick
function TreadlingGrid({
    model,
    onUpdate,
}: {
    model: WeaveModel;
    onUpdate: () => void;
}) {
    const grid = useMemo(() => {
        const g = new Uint16Array(model.treadleCount * model.weftCount);
        for (let y = 0; y < model.weftCount; y++) {
            const t = model.treadling[y];
            if (t < model.treadleCount) {
                g[y * model.treadleCount + t] = 1;
            }
        }
        return g;
    }, [model.treadling, model.weftCount, model.treadleCount]);

    return (
        <CADGrid
            model={{
                width: model.treadleCount,
                height: model.weftCount,
                grid,
            }}
            cellSize={6}
            onCellClick={(x, y) => {
                model.treadling[y] = x;
                onUpdate();
            }}
        />
    );
}

// Tie-up grid component - shows harness-treadle connections
function TieUpGrid({
    model,
    onUpdate,
}: {
    model: WeaveModel;
    onUpdate: () => void;
}) {
    return (
        <CADGrid
            model={{
                width: model.treadleCount,
                height: model.harnessCount,
                grid: model.tieUp,
            }}
            cellSize={12}
            onCellChange={(x, y, newValue) => {
                const idx = y * model.treadleCount + x;
                model.tieUp[idx] = newValue as 0 | 1;
                onUpdate();
            }}
        />
    );
}

export default function WeaveEditor({ project }: { project: ProjectRow }) {
    // Initialize model from project or create default
    const [model, setModel] = useState<WeaveModel>(() => {
        const saved = project.editorState?.weaveModel;
        if (saved) {
            // Restore Uint8Arrays from plain arrays (IndexedDB serialization)
            return {
                ...saved,
                threading: new Uint8Array(saved.threading),
                treadling: new Uint8Array(saved.treadling),
                tieUp: new Uint8Array(saved.tieUp),
                // Ensure 12A fields exist (migration safety)
                repeat: saved.repeat ?? { warp: 1, weft: 1 },
                symmetry: saved.symmetry ?? { warpMirror: false, weftMirror: false },
                loom: saved.loom ?? { maxHarness: 16, maxTreadle: 16, maxWarp: 4096, maxWeft: 4096 },
            };
        }
        return createDefaultWeaveModel();
    });

    const [showColors, setShowColors] = useState(true);
    const [useDepthShading, setUseDepthShading] = useState(false);
    const [version, setVersion] = useState(0); // Force re-render
    const [exporting, setExporting] = useState<"wif" | "png" | null>(null);

    // Generate drawdown from current model
    const drawdown = useMemo(
        () => generateDrawdown(model),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [model, version]
    );

    // Drawdown dimensions (with repeat)
    const drawdownDims = useMemo(() => getDrawdownDimensions(model), [model]);

    // Validate model
    const validationErrors = useMemo(() => validateWeave(model), [model]);

    // Update model and save to project
    const updateModel = useCallback(() => {
        setVersion((v) => v + 1);
        // Save to project editorState (will be persisted by autosave)
        project.editorState = {
            ...project.editorState,
            weaveModel: {
                ...model,
                threading: Array.from(model.threading),
                treadling: Array.from(model.treadling),
                tieUp: Array.from(model.tieUp),
            },
        };
    }, [model, project]);

    // Preset tie-up patterns
    function applyPlainWeave() {
        const tieUp = new Uint8Array(model.harnessCount * model.treadleCount);
        for (let i = 0; i < Math.min(model.harnessCount, model.treadleCount); i++) {
            tieUp[i * model.treadleCount + i] = 1;
        }
        model.tieUp = tieUp;
        updateModel();
    }

    function applyTwill() {
        model.tieUp = createTwillTieUp(model.harnessCount, model.treadleCount);
        updateModel();
    }

    function applySatin() {
        model.tieUp = createSatinTieUp(model.harnessCount, model.treadleCount, 2);
        updateModel();
    }

    // Advanced pattern generators
    function handleApply2x2Twill() {
        apply2x2Twill(model);
        updateModel();
    }

    function handleApply3x1Twill() {
        apply3x1Twill(model);
        updateModel();
    }

    function handleApplyBasket() {
        applyBasket(model);
        updateModel();
    }

    function handleApplyHerringbone() {
        applyHerringbone(model);
        updateModel();
    }

    function handleApplyDiamond() {
        applyDiamond(model);
        updateModel();
    }

    function handleStraightDraw() {
        applyStraightDraw(model);
        updateModel();
    }

    // Export handlers
    const isExporting = exporting !== null;

    async function handleExportWIF() {
        if (isExporting) return;
        setExporting("wif");
        try {
            await downloadWIF(model, project.name);
        } catch (err) {
            console.error("[WeaveEditor] WIF export failed:", err);
            showError("Failed to export WIF file");
        } finally {
            setExporting(null);
        }
    }

    async function handleExportPNG() {
        if (isExporting) return;
        setExporting("png");
        try {
            const canvas = document.querySelector("#drawdown-canvas canvas") as HTMLCanvasElement;
            if (!canvas) {
                throw new Error("Canvas not found");
            }

            const link = document.createElement("a");
            link.download = `${project.name}-drawdown.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error("[WeaveEditor] PNG export failed:", err);
            showError("Failed to export PNG file");
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
                    <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e40af" }}>
                        🧵 Weave CAD — {project.name}
                    </h2>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 4 }}>
                        {model.warpCount} warp × {model.weftCount} weft | {model.harnessCount} harnesses × {model.treadleCount} treadles
                        {(model.repeat?.warp > 1 || model.repeat?.weft > 1) && (
                            <span style={{ color: "#059669" }}>
                                {" "}| Repeat: {model.repeat.warp}×{model.repeat.weft} → {drawdownDims.width}×{drawdownDims.height}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        className={`btn btnGhost ${exporting === "wif" ? "btn--loading" : ""}`}
                        onClick={handleExportWIF}
                        disabled={isExporting}
                    >
                        {exporting === "wif" ? "Exporting..." : "Export WIF"}
                    </button>
                    <button
                        className={`btn btnGhost ${exporting === "png" ? "btn--loading" : ""}`}
                        onClick={handleExportPNG}
                        disabled={isExporting}
                    >
                        {exporting === "png" ? "Exporting..." : "Export PNG"}
                    </button>
                </div>
            </div>

            {/* Validation Warnings */}
            {validationErrors.length > 0 && (
                <div style={{
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    fontSize: "0.85rem",
                }}>
                    {validationErrors.map((e, i) => (
                        <div key={i} style={{ color: "#92400e" }}>⚠ {e}</div>
                    ))}
                </div>
            )}

            {/* Repeat & Symmetry Controls (12A) */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
                background: "#f8fafc",
                padding: 12,
                borderRadius: 8,
            }}>
                {/* Repeat Controls */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>
                        REPEAT
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
                            Warp
                            <input
                                type="number"
                                min={1}
                                max={8}
                                value={model.repeat?.warp ?? 1}
                                onChange={(e) => {
                                    model.repeat = { ...model.repeat, warp: Math.max(1, Number(e.target.value)) };
                                    updateModel();
                                }}
                                style={{ width: 50, padding: 4 }}
                            />
                        </label>
                        <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
                            Weft
                            <input
                                type="number"
                                min={1}
                                max={8}
                                value={model.repeat?.weft ?? 1}
                                onChange={(e) => {
                                    model.repeat = { ...model.repeat, weft: Math.max(1, Number(e.target.value)) };
                                    updateModel();
                                }}
                                style={{ width: 50, padding: 4 }}
                            />
                        </label>
                    </div>
                </div>

                {/* Symmetry Controls */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>
                        SYMMETRY
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={model.symmetry?.warpMirror ?? false}
                                onChange={(e) => {
                                    model.symmetry = { ...model.symmetry, warpMirror: e.target.checked };
                                    updateModel();
                                }}
                                style={{ marginRight: 4 }}
                            />
                            Warp Mirror
                        </label>
                        <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={model.symmetry?.weftMirror ?? false}
                                onChange={(e) => {
                                    model.symmetry = { ...model.symmetry, weftMirror: e.target.checked };
                                    updateModel();
                                }}
                                style={{ marginRight: 4 }}
                            />
                            Weft Mirror
                        </label>
                    </div>
                </div>
            </div>

            {/* Pattern Presets */}
            <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Tie-up:</span>
                <button className="btn btnGhost" onClick={applyPlainWeave}>Plain</button>
                <button className="btn btnGhost" onClick={applyTwill}>Twill</button>
                <button className="btn btnGhost" onClick={applySatin}>Satin</button>

                <span style={{ fontSize: "0.85rem", color: "#6b7280", marginLeft: 12 }}>Patterns:</span>
                <button className="btn btnGhost" onClick={handleApply2x2Twill}>2×2 Twill</button>
                <button className="btn btnGhost" onClick={handleApply3x1Twill}>3×1 Twill</button>
                <button className="btn btnGhost" onClick={handleApplyBasket}>Basket</button>
                <button className="btn btnGhost" onClick={handleApplyHerringbone}>Herringbone</button>
                <button className="btn btnGhost" onClick={handleApplyDiamond}>Diamond</button>
                <button className="btn btnGhost" onClick={handleStraightDraw}>Reset</button>
            </div>

            {/* Display Options */}
            <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label style={{ fontSize: "0.85rem", color: "#6b7280", cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={showColors}
                        onChange={(e) => setShowColors(e.target.checked)}
                        style={{ marginRight: 6 }}
                    />
                    Show yarn colors
                </label>
                <label style={{ fontSize: "0.85rem", color: "#6b7280", cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={useDepthShading}
                        onChange={(e) => setUseDepthShading(e.target.checked)}
                        style={{ marginRight: 6 }}
                    />
                    Depth shading
                </label>
            </div>

            {/* Draft Layout - Classic 4-part arrangement */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "auto auto",
                gridTemplateRows: "auto auto",
                gap: 16,
                alignItems: "start",
            }}>
                {/* Threading (top-left) */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                        THREADING
                    </div>
                    <div style={{ overflow: "auto", maxWidth: 420, maxHeight: 100 }}>
                        <ThreadingGrid model={model} onUpdate={updateModel} />
                    </div>
                </div>

                {/* Tie-up (top-right) */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                        TIE-UP
                    </div>
                    <TieUpGrid model={model} onUpdate={updateModel} />
                </div>

                {/* Drawdown (bottom-left) */}
                <div id="drawdown-canvas">
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                        DRAWDOWN {drawdownDims.width}×{drawdownDims.height}
                    </div>
                    <div style={{ overflow: "auto", maxWidth: 500, maxHeight: 500 }}>
                        <DrawdownCanvas
                            drawdown={drawdown}
                            model={model}
                            cellSize={6}
                            showColors={showColors}
                            useDepthShading={useDepthShading}
                        />
                    </div>
                </div>

                {/* Treadling (bottom-right) */}
                <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                        TREADLING
                    </div>
                    <div style={{ overflow: "auto", maxWidth: 100, maxHeight: 420 }}>
                        <TreadlingGrid model={model} onUpdate={updateModel} />
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
                                model.warpColors = Array(model.warpCount).fill(e.target.value);
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
                                model.weftColors = Array(model.weftCount).fill(e.target.value);
                                updateModel();
                            }}
                            style={{ display: "block", marginTop: 4, width: 48, height: 32, cursor: "pointer" }}
                        />
                    </div>
                </div>
            </div>

            {/* Help text */}
            <div className="hintCard" style={{ marginTop: 24 }}>
                <div className="hintTitle">How to Use</div>
                <div className="hintText">
                    <ul style={{ margin: "8px 0 0 16px", lineHeight: 1.6 }}>
                        <li><strong>Threading:</strong> Click to assign each warp to a harness</li>
                        <li><strong>Treadling:</strong> Click to assign each pick to a treadle</li>
                        <li><strong>Tie-up:</strong> Click to toggle harness-treadle connections</li>
                        <li><strong>Repeat:</strong> Set horizontal/vertical pattern repetitions</li>
                        <li><strong>Symmetry:</strong> Enable warp/weft mirroring for symmetric designs</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
