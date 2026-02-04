import { useMemo, useRef, useEffect, useState } from "react";
import { Stage, Layer as KonvaLayer, Rect, Text, Image as KonvaImage, Transformer, Group } from "react-konva";
import type { Stage as StageType } from "konva/lib/Stage";
import type { Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import type { Image as KonvaImageType } from "konva/lib/shapes/Image";
import useImage from "use-image";
import { useEditorStore } from "../store/useEditorStore";
import type { Layer } from "../types/project";
import { setStageRef, setViewMeta, clearRefs } from "../core/canvas/stageRef";
import { debounce } from "../core/utils/debounce";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function computeHalfDropOffset(gx: number, tileH: number) {
    return gx % 2 !== 0 ? tileH / 2 : 0;
}

function mirrorFactor(gx: number) {
    return gx % 2 !== 0 ? -1 : 1;
}

import { recolorImage } from "../core/imaging/recolor";

// Debounce delay for drag/transform operations (ms)
const TRANSFORM_DEBOUNCE_MS = 100;

function TiledImage({
    layerId,
    gx,
    gy,
    xOffset,
    yOffset,
    mirrorX,
}: {
    layerId: string;
    gx: number;
    gy: number;
    xOffset: number;
    yOffset: number;
    mirrorX: boolean;
}) {
    const layer = useEditorStore((s) => s.layers.find((l) => l.id === layerId));
    const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
    const setSelectedLayer = useEditorStore((s) => s.setSelectedLayer);
    const updateLayer = useEditorStore((s) => s.updateLayer);

    // Create debounced update function to prevent excessive state updates during drag/transform
    const debouncedUpdateLayer = useMemo(
        () => debounce((id: string, patch: Partial<Layer>) => {
            updateLayer(id, patch);
        }, TRANSFORM_DEBOUNCE_MS),
        [updateLayer]
    );

    const activeTool = useEditorStore((s) => s.activeTool);
    const addSourceColor = useEditorStore((s) => s.addSourceColor);

    // Recolor State
    const colorMap = useEditorStore((s) => s.colorMap);
    const [recoloredSrc, setRecoloredSrc] = useState<string | null>(null);

    // Early return if layer not found (shouldn't happen in normal usage)
    // Use thumbnail for display if available (for large images stored in IndexedDB)
    const layerSrc = layer?.thumbnailSrc || layer?.src || "";
    const [img] = useImage(layerSrc, "anonymous"); // Original/thumbnail image
    const [finalImg] = useImage(recoloredSrc || layerSrc, "anonymous"); // Display image (recolored or original)

    // If layer doesn't exist, render nothing
    if (!layer) return null;

    const isMainTile = gx === 0 && gy === 0;
    const isSelected = isMainTile && selectedLayerId === layerId && activeTool === "select";

    const nodeRef = useRef<KonvaImageType>(null);

    // Effect: Handle Recoloring
    useEffect(() => {
        if (!img) return;

        // If map is empty, clear recolor (show original)
        if (Object.keys(colorMap).length === 0) {
            setRecoloredSrc(null);
            return;
        }

        // Processing
        let cancelled = false;
        recolorImage(img, colorMap).then((url) => {
            if (!cancelled) setRecoloredSrc(url);
        });

        return () => { cancelled = true; };
    }, [img, colorMap]);


    // Color picking handler
    function handleColorPick(e: any) {
        if (activeTool !== "pick-color") return;

        // Get pointer position relative to image
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        const imageNode = nodeRef.current;

        if (!pointer || !imageNode) return;

        // Transform pointer to local image space
        const transform = imageNode.getAbsoluteTransform().copy();
        transform.invert();
        const localPos = transform.point(pointer);

        // ALWAYS pick from ORIGINAL image, not recolored one
        // (so we map source colors, even if currently viewing a recolor)
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx || !img) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const x = Math.floor(localPos.x);
        const y = Math.floor(localPos.y);

        if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
            const p = ctx.getImageData(x, y, 1, 1).data;
            // Convert to Hex
            const hex = `#${[p[0], p[1], p[2]].map(x => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
            addSourceColor(hex);
        }
    }

    if (!layer.visible && !isMainTile) return null;

    return (
        <KonvaImage
            id={isMainTile ? `main-${layer.id}` : undefined}
            ref={nodeRef}
            image={finalImg || img} // Use final (recolored) if avail
            x={layer.x + xOffset}
            y={layer.y + yOffset}
            rotation={layer.rotation}
            scaleX={(mirrorX ? -1 : 1) * layer.scale}
            scaleY={layer.scale}

            draggable={isSelected}
            opacity={layer.visible ? 1 : 0.3}
            onMouseDown={(e) => {
                if (!isMainTile) return;
                e.cancelBubble = true;

                if (activeTool === "pick-color") {
                    handleColorPick(e);
                } else {
                    setSelectedLayer(layer.id);
                }
            }}
            onTouchStart={(e) => {
                if (!isMainTile) return;
                e.cancelBubble = true;
                setSelectedLayer(layer.id);
            }}
            onDragEnd={(e) => {
                if (!isMainTile) return;
                debouncedUpdateLayer(layer.id, { x: e.target.x() - xOffset, y: e.target.y() - yOffset });
            }}
            onTransformEnd={(e) => {
                if (!isMainTile) return;

                const node = e.target;
                const uniformScale = Math.max(Math.abs(node.scaleX()), Math.abs(node.scaleY()));

                debouncedUpdateLayer(layer.id, {
                    x: node.x() - xOffset,
                    y: node.y() - yOffset,
                    rotation: node.rotation(),
                    scale: uniformScale,
                });

                node.scaleX((mirrorX ? -1 : 1) * uniformScale);
                node.scaleY(uniformScale);
            }}
        />
    );
}

export default function TilePreviewCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 900, height: 600 });

    const projectId = useEditorStore((s) => s.projectId);
    const layers = useEditorStore((s) => s.layers);
    const selectedLayerId = useEditorStore((s) => s.selectedLayerId);

    const repeatMode = useEditorStore((s) => s.repeatMode);
    const tileWidth = useEditorStore((s) => s.tileWidth);
    const tileHeight = useEditorStore((s) => s.tileHeight);
    const seamPreview = useEditorStore((s) => s.seamPreview);

    const viewX = useEditorStore((s) => s.viewX);
    const viewY = useEditorStore((s) => s.viewY);
    const viewScale = useEditorStore((s) => s.viewScale);
    const setView = useEditorStore((s) => s.setView);
    const resetView = useEditorStore((s) => s.resetView);

    const setSelectedLayer = useEditorStore((s) => s.setSelectedLayer);

    const transformerRef = useRef<TransformerType>(null);
    const stageRef = useRef<StageType>(null);

    // Measure container size
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setContainerSize({ width: rect.width, height: rect.height });
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const stageW = containerSize.width;
    const stageH = containerSize.height;

    // fit 3x3 grid into view
    const baseScale = useMemo(() => {
        const padding = 40;
        const maxW = stageW - padding * 2;
        const maxH = stageH - padding * 2;

        const s1 = maxW / (tileWidth * 3);
        const s2 = maxH / (tileHeight * 3);

        return clamp(Math.min(s1, s2), 0.01, 0.5);
    }, [tileWidth, tileHeight, stageW, stageH]);

    // combined scale (base fit scale * user zoom scale)
    const scale = baseScale * viewScale;

    // tile centered
    const originX = stageW / 2 - (tileWidth * scale) / 2 + viewX;
    const originY = stageH / 2 - (tileHeight * scale) / 2 + viewY;

    const tiles = useMemo(() => {
        const out: { gx: number; gy: number; xOffset: number; yOffset: number; mirrorX: boolean }[] = [];
        for (let gx = -1; gx <= 1; gx++) {
            for (let gy = -1; gy <= 1; gy++) {
                let yOffset = gy * tileHeight;
                if (repeatMode === "half-drop") yOffset += computeHalfDropOffset(gx, tileHeight);
                const mirrorX = repeatMode === "mirror" ? mirrorFactor(gx) === -1 : false;

                out.push({
                    gx,
                    gy,
                    xOffset: gx * tileWidth,
                    yOffset,
                    mirrorX,
                });
            }
        }
        return out;
    }, [repeatMode, tileHeight, tileWidth]);

    const activeTool = useEditorStore((s) => s.activeTool); // Add this hook at component level

    // transformer attach
    useEffect(() => {
        const tr = transformerRef.current;
        const stage = stageRef.current;
        if (!tr || !stage) return;

        // Only show transformer in 'select' mode
        if (activeTool !== "select") {
            tr.nodes([]);
            tr.getLayer()?.batchDraw();
            return;
        }

        const selectedNode = stage.findOne(`#main-${selectedLayerId}`);
        if (selectedNode) {
            tr.nodes([selectedNode]);
        } else {
            tr.nodes([]);
        }
        tr.getLayer()?.batchDraw();
    }, [selectedLayerId, layers.length, activeTool]);

    // Store stage ref in module (not on window for security)
    useEffect(() => {
        if (stageRef.current) {
            setStageRef(stageRef.current);
        }

        // Cleanup on unmount
        return () => {
            clearRefs();
        };
    }, []);

    // Update view metadata when view changes
    useEffect(() => {
        const tilePxRect = {
            x: originX,
            y: originY,
            width: tileWidth * scale,
            height: tileHeight * scale,
        };

        const sheetPxRect = {
            x: originX - tileWidth * scale,
            y: originY - tileHeight * scale,
            width: tileWidth * scale * 3,
            height: tileHeight * scale * 3,
        };

        setViewMeta({ tilePxRect, sheetPxRect });
    }, [originX, originY, tileWidth, tileHeight, scale]);

    // zoom handler
    function handleWheel(e: any) {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = viewScale;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const factor = direction > 0 ? 1.08 : 1 / 1.08;
        const newScale = clamp(oldScale * factor, 0.3, 6);

        const mousePointTo = {
            x: (pointer.x - originX) / (baseScale * oldScale),
            y: (pointer.y - originY) / (baseScale * oldScale),
        };

        const newOriginX = pointer.x - mousePointTo.x * (baseScale * newScale);
        const newOriginY = pointer.y - mousePointTo.y * (baseScale * newScale);

        setView({
            viewScale: newScale,
            viewX: newOriginX - (stageW / 2 - (tileWidth * baseScale * newScale) / 2),
            viewY: newOriginY - (stageH / 2 - (tileHeight * baseScale * newScale) / 2),
        });
    }

    // pan with space + drag
    const isSpaceDown = useRef(false);
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                isSpaceDown.current = true;
            }
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === "Space") isSpaceDown.current = false;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    const lastPanPos = useRef<{ x: number; y: number } | null>(null);

    function handleMouseDown(e: any) {
        const stage = e.target.getStage();
        if (e.target === stage) {
            setSelectedLayer(null);
        }

        if (isSpaceDown.current) {
            const pos = stage.getPointerPosition();
            if (pos) lastPanPos.current = pos;
        }
    }

    function handleMouseMove(e: any) {
        if (!isSpaceDown.current) return;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (!pos || !lastPanPos.current) return;

        const dx = pos.x - lastPanPos.current.x;
        const dy = pos.y - lastPanPos.current.y;

        lastPanPos.current = pos;
        setView({ viewX: viewX + dx, viewY: viewY + dy });
    }

    function handleMouseUp() {
        lastPanPos.current = null;
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                background: "#f3f4f6",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <Stage
                ref={stageRef}
                width={stageW}
                height={stageH}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
            >
                {/* background */}
                <KonvaLayer>
                    <Rect x={0} y={0} width={stageW} height={stageH} fill="#ffffff" />
                </KonvaLayer>

                {/* main group that gets scaled */}
                <KonvaLayer>
                    <Group x={originX} y={originY} scaleX={scale} scaleY={scale}>
                        {/* seams */}
                        {tiles.map((t, idx) => (
                            <Rect
                                key={idx}
                                x={t.xOffset}
                                y={t.yOffset}
                                width={tileWidth}
                                height={tileHeight}
                                stroke={seamPreview ? "#374151" : "#d1d5db"}
                                strokeWidth={seamPreview ? 2 / scale : 1 / scale}
                                dash={seamPreview ? [] : [6 / scale, 6 / scale]}
                            />
                        ))}

                        {/* active tile border */}
                        <Rect x={0} y={0} width={tileWidth} height={tileHeight} stroke="#6366f1" strokeWidth={3 / scale} />

                        {!projectId ? (
                            <Text
                                text="Create/Open a project to start"
                                x={0}
                                y={tileHeight / 2 - 10}
                                width={tileWidth}
                                align="center"
                                fontSize={16 / scale}
                                fill="#6b7280"
                            />
                        ) : !layers || layers.length === 0 ? (
                            <Text
                                text="Upload an image to start designing"
                                x={0}
                                y={tileHeight / 2 - 10}
                                width={tileWidth}
                                align="center"
                                fontSize={14 / scale}
                                fill="#6b7280"
                            />
                        ) : (
                            tiles.map((t) =>
                                layers.map((layer) => (
                                    <TiledImage
                                        key={`${t.gx}-${t.gy}-${layer.id}`}
                                        layerId={layer.id}
                                        gx={t.gx}
                                        gy={t.gy}
                                        xOffset={t.xOffset}
                                        yOffset={t.yOffset}
                                        mirrorX={t.mirrorX}
                                    />
                                ))
                            )
                        )}
                    </Group>

                    {/* transformer */}
                    <Transformer
                        ref={transformerRef}
                        rotateEnabled
                        enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 5 || newBox.height < 5) return oldBox;
                            return newBox;
                        }}
                    />
                </KonvaLayer>
            </Stage>

            {/* Controls hint */}
            <div style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                display: "flex",
                gap: 6,
                alignItems: "center"
            }}>
                <div style={{
                    background: "rgba(0,0,0,0.75)",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: "0.7rem"
                }}>
                    Wheel: Zoom • Space+Drag: Pan
                </div>
                <button
                    onClick={resetView}
                    style={{
                        background: "rgba(0,0,0,0.75)",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: "0.7rem",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    Reset View
                </button>
            </div>

            {/* Zoom indicator */}
            <div style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                background: "rgba(0,0,0,0.75)",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: "0.7rem"
            }}>
                {Math.round(viewScale * 100)}%
            </div>
        </div>
    );
}
