import { useMemo, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { reduceColorsToLayer } from "../core/imaging/reduceColors";
import { resolveImageSource } from "../core/storage/imageStore";

export default function ProductionPanel() {
    const projectId = useEditorStore((s) => s.projectId);

    const layers = useEditorStore((s) => s.layers);
    const selectedLayerId = useEditorStore((s) => s.selectedLayerId);

    const addImageLayer = useEditorStore((s) => s.addImageLayer);

    const [k, setK] = useState(8);
    const [isRunning, setIsRunning] = useState(false);

    const selectedLayer = useMemo(
        () => layers.find((l) => l.id === selectedLayerId) ?? null,
        [layers, selectedLayerId]
    );

    const disabled = !projectId || !selectedLayer || selectedLayer.type !== "image";

    async function runReduction() {
        if (!selectedLayer) return;
        setIsRunning(true);
        try {
            // Resolve blob reference to full image if needed
            const srcDataUrl = await resolveImageSource(selectedLayer.src, true);

            const result = await reduceColorsToLayer({
                srcDataUrl,
                k,
            });

            addImageLayer({
                name: `Reduced (${result.colorCount} colors)`,
                src: result.dataUrl,
                reductionMeta: result,
            });

            alert(
                `Reduction complete!\nColors: ${result.colorCount}\nTop: ${result.colors
                    .slice(0, 5)
                    .map((c) => `${c.hex} (${c.percent.toFixed(1)}%)`)
                    .join(", ")}`
            );

            // auto select the newly created layer (store usually appends and selects, check store logic)
            // addImageLayer sets selectedLayerId.
        } catch (e) {
            console.error(e);
            alert("Failed to reduce colors.");
        } finally {
            setIsRunning(false);
        }
    }

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Production Tools (Color Reduction)</div>
                <div className="hintText">
                    Reduce artwork to a limited number of production colors (2–24). This will be the base
                    for separations/plates export.
                </div>
            </div>

            <div className="formGroup">
                <label className="label">Target colors</label>
                <input
                    className="input"
                    type="number"
                    min={2}
                    max={24}
                    value={k}
                    onChange={(e) => setK(Number(e.target.value))}
                    disabled={!projectId || isRunning}
                />
            </div>

            <button
                className="btn"
                style={{ width: "100%" }}
                onClick={runReduction}
                disabled={disabled || isRunning}
            >
                {isRunning ? "Reducing..." : "Reduce Colors → New Layer"}
            </button>

            {!projectId && (
                <div className="hintCard" style={{ marginTop: 12 }}>
                    <div className="hintTitle">No project open</div>
                    <div className="hintText">Create/Open a project to use production tools.</div>
                </div>
            )}

            {projectId && !selectedLayer && (
                <div className="hintCard" style={{ marginTop: 12 }}>
                    <div className="hintTitle">Select an image layer</div>
                    <div className="hintText">
                        Click a layer in your Layers panel first (it will be used as the reduction source).
                    </div>
                </div>
            )}
        </div>
    );
}
