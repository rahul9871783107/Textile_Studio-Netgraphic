import { useRef, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { fileToDataUrl } from "../core/imaging/fileToDataUrl";
import { prepareLayerSource } from "../core/storage/imageStore";

// Load image and get dimensions
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = src;
    });
}

export default function LayerPanel() {
    const projectId = useEditorStore((s) => s.projectId);
    const layers = useEditorStore((s) => s.layers);
    const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
    const tileWidth = useEditorStore((s) => s.tileWidth);
    const tileHeight = useEditorStore((s) => s.tileHeight);

    const addImageLayer = useEditorStore((s) => s.addImageLayer);
    const setSelectedLayer = useEditorStore((s) => s.setSelectedLayer);
    const removeLayer = useEditorStore((s) => s.removeLayer);
    const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility);
    const updateLayer = useEditorStore((s) => s.updateLayer);

    const fileRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    async function handleUpload(file: File) {
        if (!projectId) return;

        setIsUploading(true);
        try {
            const dataUrl = await fileToDataUrl(file);

            // Prepare image for storage (handles large images automatically)
            const prepared = await prepareLayerSource(dataUrl, projectId);

            // Calculate scale to fit artwork within 80% of tile
            const maxW = tileWidth * 0.8;
            const maxH = tileHeight * 0.8;
            const scaleX = maxW / prepared.width;
            const scaleY = maxH / prepared.height;
            const fitScale = Math.min(scaleX, scaleY, 1); // Don't upscale

            // Center the artwork in the tile
            const scaledW = prepared.width * fitScale;
            const scaledH = prepared.height * fitScale;
            const x = (tileWidth - scaledW) / 2;
            const y = (tileHeight - scaledH) / 2;

            addImageLayer({
                name: file.name,
                src: prepared.src,
                thumbnailSrc: prepared.thumbnailSrc,
                x,
                y,
                scale: fitScale,
                imgW: prepared.width,
                imgH: prepared.height,
            });
        } catch (err) {
            console.error("Failed to upload image:", err);
            // Fallback: try to add without image store optimization
            try {
                const dataUrl = await fileToDataUrl(file);
                const dims = await getImageDimensions(dataUrl);
                addImageLayer({
                    name: file.name,
                    src: dataUrl,
                    imgW: dims.width,
                    imgH: dims.height,
                });
            } catch {
                alert("Failed to upload image");
            }
        } finally {
            setIsUploading(false);
        }
    }

    // Auto-fit selected layer to tile
    function handleAutoFit() {
        const layer = layers.find((l) => l.id === selectedLayerId);
        if (!layer) return;

        const imgW = layer.imgW || 100;
        const imgH = layer.imgH || 100;

        const maxW = tileWidth * 0.9;
        const maxH = tileHeight * 0.9;
        const scaleX = maxW / imgW;
        const scaleY = maxH / imgH;
        const fitScale = Math.min(scaleX, scaleY);

        const scaledW = imgW * fitScale;
        const scaledH = imgH * fitScale;
        const x = (tileWidth - scaledW) / 2;
        const y = (tileHeight - scaledH) / 2;

        updateLayer(layer.id, { x, y, scale: fitScale, rotation: 0 });
    }

    const hasSelection = selectedLayerId !== null;

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Artwork / Layers</div>
                <div className="hintText">
                    Upload an image (PNG/JPG) as a layer. It will auto-fit to tile size.
                </div>
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleUpload(file);
                    e.target.value = "";
                }}
            />

            <button
                className="btn"
                style={{ width: "100%", marginBottom: 8 }}
                disabled={!projectId || isUploading}
                onClick={() => fileRef.current?.click()}
            >
                {isUploading ? "Uploading..." : "+ Upload Artwork"}
            </button>

            <button
                className="btn btnGhost"
                style={{ width: "100%", marginBottom: 10 }}
                disabled={!hasSelection}
                onClick={handleAutoFit}
            >
                Auto Fit to Tile
            </button>

            {layers.length === 0 ? (
                <div className="hintCard">
                    <div className="hintTitle">No layers</div>
                    <div className="hintText">Upload an artwork image to start designing.</div>
                </div>
            ) : (
                layers
                    .slice()
                    .reverse()
                    .map((layer) => {
                        const isSelected = layer.id === selectedLayerId;
                        return (
                            <div
                                key={layer.id}
                                className="layerItem"
                                style={{
                                    marginTop: 10,
                                    borderColor: isSelected ? "var(--accent-primary)" : undefined,
                                }}
                                onClick={() => setSelectedLayer(layer.id)}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="layerName">
                                            {layer.name}
                                        </div>
                                        <div className="layerMeta">{layer.visible ? "Visible" : "Hidden"}</div>
                                    </div>

                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                            className="btn btnGhost btnSm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLayerVisibility(layer.id);
                                            }}
                                        >
                                            {layer.visible ? "Hide" : "Show"}
                                        </button>

                                        <button
                                            className="btn btnGhost btnSm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const ok = window.confirm("Delete layer?");
                                                if (!ok) return;
                                                removeLayer(layer.id);
                                            }}
                                        >
                                            Del
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
            )}
        </div>
    );
}
