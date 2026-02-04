import { useMemo } from "react";
import { useEditorStore } from "../store/useEditorStore";

export default function RepeatPanel() {
    const projectId = useEditorStore((s) => s.projectId);

    const repeatMode = useEditorStore((s) => s.repeatMode);
    const tileWidth = useEditorStore((s) => s.tileWidth);
    const tileHeight = useEditorStore((s) => s.tileHeight);
    const seamPreview = useEditorStore((s) => s.seamPreview);

    const setRepeatMode = useEditorStore((s) => s.setRepeatMode);
    const setTileSize = useEditorStore((s) => s.setTileSize);
    const setSeamPreview = useEditorStore((s) => s.setSeamPreview);

    const disabled = useMemo(() => !projectId, [projectId]);

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Repeat Controls</div>
                <div className="hintText">
                    Configure tile size and repeat mode. These settings are saved locally per project.
                </div>
            </div>

            <div className="formGroup">
                <label className="label">Repeat Mode</label>
                <select
                    className="select"
                    value={repeatMode}
                    onChange={(e) => setRepeatMode(e.target.value as any)}
                    disabled={disabled}
                >
                    <option value="straight">Straight Repeat</option>
                    <option value="half-drop">Half-drop Repeat</option>
                    <option value="mirror">Mirror Repeat</option>
                </select>
            </div>

            <div className="formRow">
                <div className="formGroup">
                    <label className="label">Tile Width (px)</label>
                    <input
                        className="input"
                        type="number"
                        value={tileWidth}
                        min={200}
                        max={10000}
                        step={50}
                        disabled={disabled}
                        onChange={(e) => setTileSize(Number(e.target.value || 0), tileHeight)}
                    />
                </div>

                <div className="formGroup">
                    <label className="label">Tile Height (px)</label>
                    <input
                        className="input"
                        type="number"
                        value={tileHeight}
                        min={200}
                        max={10000}
                        step={50}
                        disabled={disabled}
                        onChange={(e) => setTileSize(tileWidth, Number(e.target.value || 0))}
                    />
                </div>
            </div>

            <div className="formGroup" style={{ marginTop: 6 }}>
                <label className="switchRow">
                    <input
                        type="checkbox"
                        checked={seamPreview}
                        onChange={(e) => setSeamPreview(e.target.checked)}
                        disabled={disabled}
                    />
                    <span>Seam Preview</span>
                </label>
            </div>

            {!projectId && (
                <div className="hintCard" style={{ marginTop: 12 }}>
                    <div className="hintTitle">No project open</div>
                    <div className="hintText">Create or open a project to enable repeat settings.</div>
                </div>
            )}
        </div>
    );
}
