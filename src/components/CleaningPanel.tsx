import { useMemo, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { removeSpecks } from "../core/imaging/speckRemoval";
import { mergeColorInImage } from "../core/imaging/mergeColors";
import { majorityFilter } from "../core/imaging/majorityFilter";

export default function CleaningPanel() {
    const projectId = useEditorStore((s) => s.projectId);
    const layers = useEditorStore((s) => s.layers);
    const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
    const updateLayer = useEditorStore((s) => s.updateLayer);

    const selectedLayer = useMemo(
        () => layers.find((l: any) => l.id === selectedLayerId) ?? null,
        [layers, selectedLayerId]
    );

    const reductionMeta = selectedLayer?.reductionMeta;
    const paletteHex = (reductionMeta?.colors ?? []).map((c: any) => c.hex);

    const [minClusterSize, setMinClusterSize] = useState(50);
    const [passes, setPasses] = useState(2);

    const [mergeFrom, setMergeFrom] = useState<string>("");
    const [mergeTo, setMergeTo] = useState<string>("");

    const [busy, setBusy] = useState(false);

    const enabled =
        !!projectId &&
        !!selectedLayer &&
        selectedLayer.type === "image" &&
        !!reductionMeta &&
        paletteHex.length > 1;

    async function applyNewImage(newDataUrl: string) {
        if (!selectedLayer) return;
        updateLayer(selectedLayer.id, { src: newDataUrl });
    }

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Cleaning Tools (Quantized)</div>
                <div className="hintText">
                    Works only on a <b>Reduced</b> layer (generated from Production Tools). These tools improve print readiness.
                </div>
            </div>

            {!enabled && (
                <div className="hintCard">
                    <div className="hintTitle">Select a Reduced layer</div>
                    <div className="hintText">
                        Please select a reduced/quantized layer first. Cleaning tools require exact palette data.
                    </div>
                </div>
            )}

            {enabled && (
                <>
                    {/* Speck removal */}
                    <div className="divider" />
                    <div className="formGroup">
                        <label className="label">Speck Removal (min cluster size)</label>
                        <input
                            className="input"
                            type="number"
                            min={5}
                            max={2000}
                            value={minClusterSize}
                            onChange={(e) => setMinClusterSize(Number(e.target.value))}
                            disabled={busy}
                        />
                        <button
                            className="btn btnGhost"
                            disabled={busy}
                            onClick={async () => {
                                if (!selectedLayer) return;
                                setBusy(true);
                                try {
                                    const res = await removeSpecks({
                                        reducedLayerDataUrl: selectedLayer.src,
                                        paletteHex,
                                        minClusterSize,
                                    });
                                    await applyNewImage(res.cleanedDataUrl);
                                    alert(`Speck removal done. Pixels replaced: ${res.removedPixels}`);
                                } catch (err) {
                                    console.error("[CleaningPanel] Speck removal failed:", err);
                                    alert("Speck removal failed. Please try again.");
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            Run Speck Removal
                        </button>
                    </div>

                    {/* Merge colors */}
                    <div className="divider" />
                    <div className="formGroup">
                        <label className="label">Merge Colors</label>

                        <div className="formRow">
                            <div className="formGroup">
                                <label className="label">Merge FROM</label>
                                <select
                                    className="select"
                                    value={mergeFrom}
                                    onChange={(e) => setMergeFrom(e.target.value)}
                                    disabled={busy}
                                >
                                    <option value="">Select color</option>
                                    {paletteHex.map((h: string) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="formGroup">
                                <label className="label">Merge TO</label>
                                <select
                                    className="select"
                                    value={mergeTo}
                                    onChange={(e) => setMergeTo(e.target.value)}
                                    disabled={busy}
                                >
                                    <option value="">Select color</option>
                                    {paletteHex.map((h: string) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            className="btn btnGhost"
                            disabled={busy || !mergeFrom || !mergeTo || mergeFrom === mergeTo}
                            onClick={async () => {
                                if (!selectedLayer) return;
                                setBusy(true);
                                try {
                                    const res = await mergeColorInImage({
                                        reducedLayerDataUrl: selectedLayer.src,
                                        fromHex: mergeFrom,
                                        toHex: mergeTo,
                                    });
                                    await applyNewImage(res.mergedDataUrl);
                                    alert(`Merge done. Changed pixels: ${res.changedPixels}`);
                                } catch (err) {
                                    console.error("[CleaningPanel] Color merge failed:", err);
                                    alert("Color merge failed. Please try again.");
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            Merge Now
                        </button>
                    </div>

                    {/* Edge simplify */}
                    <div className="divider" />
                    <div className="formGroup">
                        <label className="label">Edge Simplify (majority filter passes)</label>
                        <input
                            className="input"
                            type="number"
                            min={1}
                            max={6}
                            value={passes}
                            onChange={(e) => setPasses(Number(e.target.value))}
                            disabled={busy}
                        />
                        <button
                            className="btn btnGhost"
                            disabled={busy}
                            onClick={async () => {
                                if (!selectedLayer) return;
                                setBusy(true);
                                try {
                                    const res = await majorityFilter({
                                        reducedLayerDataUrl: selectedLayer.src,
                                        passes,
                                    });
                                    await applyNewImage(res.filteredDataUrl);
                                    alert("Edge simplify completed.");
                                } catch (err) {
                                    console.error("[CleaningPanel] Edge simplify failed:", err);
                                    alert("Edge simplify failed. Please try again.");
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            Run Edge Simplify
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
