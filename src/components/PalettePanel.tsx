import { useMemo, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";

function normalizeHex(hex: string) {
    const h = hex.trim().toUpperCase();
    if (!h.startsWith("#")) return `#${h}`;
    return h;
}

export default function PalettePanel() {
    const projectId = useEditorStore((s) => s.projectId);

    const palettes = useEditorStore((s) => s.palettes);
    const activePaletteId = useEditorStore((s) => s.activePaletteId);

    const setActivePalette = useEditorStore((s) => s.setActivePalette);
    const createPalette = useEditorStore((s) => s.createPalette);
    const deletePalette = useEditorStore((s) => s.deletePalette);
    const addPaletteColor = useEditorStore((s) => s.addPaletteColor);
    const removePaletteColor = useEditorStore((s) => s.removePaletteColor);

    const [newColorHex, setNewColorHex] = useState("#6366f1");

    const activePalette = useMemo(
        () => palettes.find((p) => p.id === activePaletteId) ?? null,
        [palettes, activePaletteId]
    );

    const disabled = !projectId;

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Palettes</div>
                <div className="hintText">
                    Create palettes and add colors. Palettes are saved with your project.
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                    className="btn"
                    disabled={disabled}
                    onClick={() => {
                        const name = window.prompt("Palette name?", "Main Palette");
                        if (!name) return;
                        createPalette(name);
                    }}
                >
                    + Palette
                </button>

                <button
                    className="btn btnGhost"
                    disabled={disabled || !activePaletteId}
                    onClick={() => {
                        const ok = window.confirm("Delete active palette?");
                        if (!ok) return;
                        if (activePaletteId) deletePalette(activePaletteId);
                    }}
                >
                    Delete
                </button>
            </div>

            <div className="formGroup">
                <label className="label">Active Palette</label>
                <select
                    className="select"
                    value={activePaletteId ?? ""}
                    onChange={(e) => setActivePalette(e.target.value || null)}
                    disabled={disabled}
                >
                    <option value="">— None —</option>
                    {palettes.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.colors.length})
                        </option>
                    ))}
                </select>
            </div>

            {activePalette && (
                <div>
                    <div className="divider" />

                    <div className="formGroup">
                        <label className="label">Add color</label>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input
                                type="color"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                disabled={disabled}
                                style={{
                                    width: 40,
                                    height: 32,
                                    padding: 0,
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 6,
                                    cursor: "pointer"
                                }}
                            />
                            <input
                                className="input"
                                type="text"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn"
                                disabled={disabled}
                                onClick={() => addPaletteColor(activePalette.id, normalizeHex(newColorHex))}
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="paletteSwatches">
                        {activePalette.colors.map((c) => (
                            <div
                                key={c.id}
                                className="paletteSwatch"
                                title={`${c.name}\n${c.hex}\nClick to remove`}
                                onClick={() => {
                                    const ok = window.confirm(`Remove ${c.hex}?`);
                                    if (ok) removePaletteColor(activePalette.id, c.id);
                                }}
                            >
                                <div
                                    className="swatchColor"
                                    style={{ background: c.hex }}
                                />
                                <div className="swatchHex">{c.hex}</div>
                            </div>
                        ))}
                        {activePalette.colors.length === 0 && (
                            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                No colors yet. Add some above!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
