import { useState } from "react";
import { useEditorStore } from "../store/useEditorStore";

export default function RecolorPanel() {
    const projectId = useEditorStore((s) => s.projectId);

    const activeTool = useEditorStore((s) => s.activeTool);
    const setActiveTool = useEditorStore((s) => s.setActiveTool);

    const activePaletteId = useEditorStore((s) => s.activePaletteId);
    const palettes = useEditorStore((s) => s.palettes);
    const activePalette = palettes.find(p => p.id === activePaletteId);

    const sourceColors = useEditorStore((s) => s.sourceColors);
    const removeSourceColor = useEditorStore((s) => s.removeSourceColor);

    const colorMap = useEditorStore((s) => s.colorMap);
    const setColorMap = useEditorStore((s) => s.setColorMap);
    const shuffleColors = useEditorStore((s) => s.shuffleColors);

    const colorways = useEditorStore((s) => s.colorways);
    const activeColorwayId = useEditorStore((s) => s.activeColorwayId);
    const createColorway = useEditorStore((s) => s.createColorway);
    const applyColorway = useEditorStore((s) => s.applyColorway);
    const deleteColorway = useEditorStore((s) => s.deleteColorway);

    const [selectedSourceColor, setSelectedSourceColor] = useState<string | null>(null);

    const disabled = !projectId;

    function assignColor(paletteColorHex: string) {
        if (!selectedSourceColor) return;
        setColorMap({
            ...colorMap,
            [selectedSourceColor]: paletteColorHex
        });
    }

    function clearMapping(sourceHex: string) {
        const next = { ...colorMap };
        delete next[sourceHex];
        setColorMap(next);
    }

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Recolor Engine</div>
                <div className="hintText">
                    1. Pick source colors from artwork<br />
                    2. Map them to palette colors<br />
                    3. Save as Colorway
                </div>
            </div>

            {/* Tool Toggle */}
            <div className="switchRow" style={{ marginBottom: 12 }}>
                <button
                    className={`switchOption ${activeTool === "select" ? "active" : ""} `}
                    onClick={() => setActiveTool("select")}
                    disabled={disabled}
                >
                    Select / Move
                </button>
                <button
                    className={`switchOption ${activeTool === "pick-color" ? "active" : ""} `}
                    onClick={() => setActiveTool("pick-color")}
                    disabled={disabled}
                >
                    Pick Source Color
                </button>
            </div>

            {activeTool === "pick-color" && (
                <div style={{ padding: "8px", background: "var(--bg-secondary)", borderRadius: 6, marginBottom: 12, fontSize: "0.8rem" }}>
                    👉 Click pixels on the canvas to add them to "Source Colors" below.
                </div>
            )}

            {/* Source Colors List */}
            <div className="formGroup">
                <label className="label">Source Colors (Detected)</label>

                {sourceColors.length === 0 ? (
                    <div style={{ padding: 10, color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: 6 }}>
                        No source colors picked yet.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                        {sourceColors.map(hex => {
                            const targetHex = colorMap[hex];
                            const isSelected = selectedSourceColor === hex;

                            return (
                                <div
                                    key={hex}
                                    className="projectItem"
                                    style={{
                                        padding: "8px",
                                        border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
                                        backgroundColor: isSelected ? "rgba(99, 102, 241, 0.05)" : undefined,
                                        cursor: "pointer"
                                    }}
                                    onClick={() => setSelectedSourceColor(hex)}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>

                                        {/* Source */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div className="swatchColor" style={{ width: 24, height: 24, background: hex }} />
                                            <div style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{hex}</div>
                                        </div>

                                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>➔</div>

                                        {/* Target */}
                                        {targetHex ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <div className="swatchColor" style={{ width: 24, height: 24, background: targetHex }} />
                                                <button
                                                    className="btn btnGhost btnSm"
                                                    onClick={(e) => { e.stopPropagation(); clearMapping(hex); }}
                                                    title="Clear mapping"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                                Unmapped
                                            </div>
                                        )}

                                        <button
                                            className="btn btnGhost btnSm"
                                            onClick={(e) => { e.stopPropagation(); removeSourceColor(hex); }}
                                        >
                                            Del
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedSourceColor && (
                <div style={{ marginBottom: 12, padding: 10, background: "var(--bg-secondary)", borderRadius: 8 }}>
                    <div style={{ fontSize: "0.75rem", marginBottom: 6, fontWeight: 600 }}>
                        Pick Target for {selectedSourceColor}:
                    </div>

                    {activePalette ? (
                        <div className="paletteSwatches">
                            {activePalette.colors.map(c => (
                                <div
                                    key={c.id}
                                    className="paletteSwatch"
                                    onClick={() => assignColor(c.hex)}
                                    style={{ padding: 4 }}
                                >
                                    <div className="swatchColor" style={{ width: 24, height: 24, background: c.hex }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Select a palette first.</div>
                    )}
                </div>
            )}

            <div className="divider" />

            {/* Colorways */}
            <div className="formGroup">
                <label className="label">Colorways</label>

                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button
                        className="btn"
                        disabled={disabled || !activePaletteId}
                        onClick={() => createColorway(`Colorway ${colorways.length + 1} `)}
                    >
                        + Save Current
                    </button>

                    <button
                        className="btn btnGhost"
                        disabled={disabled || !activePaletteId}
                        onClick={shuffleColors}
                    >
                        Shuffle
                    </button>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    {colorways.map(cw => (
                        <div
                            key={cw.id}
                            className="projectItem"
                            style={{
                                borderColor: activeColorwayId === cw.id ? "var(--accent-primary)" : undefined
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div
                                    className="projectName"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => applyColorway(cw.id)}
                                >
                                    {cw.name}
                                </div>
                                <div>
                                    {activeColorwayId !== cw.id && (
                                        <button className="btn btnGhost btnSm" onClick={() => applyColorway(cw.id)}>Load</button>
                                    )}
                                    <button className="btn btnGhost btnSm" onClick={() => deleteColorway(cw.id)}>Del</button>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 4 }}>
                                {/* Preview mini swatches of the mapping */}
                                {Object.values(cw.colorMap).slice(0, 8).map((hex: any, idx) => (
                                    <div key={idx} style={{ width: 12, height: 12, borderRadius: 2, background: hex }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
