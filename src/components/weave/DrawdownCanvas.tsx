import { useEffect, useRef, useMemo } from "react";
import type { WeaveModel } from "../../types/weaveModel";
import { getDrawdownCellColor, getDrawdownDimensions, applyDepthShading } from "../../core/cad/weaveDrawdown";

type Props = {
    drawdown: Uint8Array;
    model: WeaveModel;
    cellSize?: number;
    showColors?: boolean;
    useDepthShading?: boolean;
};

export default function DrawdownCanvas({
    drawdown,
    model,
    cellSize = 6,
    showColors = true,
    useDepthShading = false,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { warpCount, weftCount, warpColors, weftColors } = model;

    // Account for repeat in dimensions
    const dims = getDrawdownDimensions(model);
    const outWidth = dims.width;
    const outHeight = dims.height;

    const canvasWidth = outWidth * cellSize;
    const canvasHeight = outHeight * cellSize;

    // Memoize drawing for performance
    const imageData = useMemo(() => {
        const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);

        for (let y = 0; y < outHeight; y++) {
            for (let x = 0; x < outWidth; x++) {
                const isWarpUp = drawdown[y * outWidth + x] === 1;

                // Get base colors using modulo for repeated sections
                const baseX = x % warpCount;
                const baseY = y % weftCount;

                let color: string;
                if (showColors) {
                    const warpColor = warpColors[baseX] ?? "#111827";
                    const weftColor = weftColors[baseY] ?? "#ffffff";
                    color = getDrawdownCellColor(isWarpUp, warpColor, weftColor);

                    // Apply depth shading if enabled
                    if (useDepthShading) {
                        color = applyDepthShading(color, isWarpUp);
                    }
                } else {
                    color = isWarpUp ? "#111827" : "#ffffff";
                }

                // Parse hex color
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);

                // Fill cell pixels
                for (let cy = 0; cy < cellSize; cy++) {
                    for (let cx = 0; cx < cellSize; cx++) {
                        const px = x * cellSize + cx;
                        const py = y * cellSize + cy;
                        const idx = (py * canvasWidth + px) * 4;
                        data[idx] = r;
                        data[idx + 1] = g;
                        data[idx + 2] = b;
                        data[idx + 3] = 255;
                    }
                }
            }
        }

        return new ImageData(data, canvasWidth, canvasHeight);
    }, [drawdown, outWidth, outHeight, warpCount, weftCount, warpColors, weftColors, cellSize, showColors, useDepthShading, canvasWidth, canvasHeight]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.putImageData(imageData, 0, 0);
    }, [imageData, canvasWidth, canvasHeight]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                border: "1px solid #d1d5db",
                imageRendering: "pixelated",
                maxWidth: "100%",
            }}
        />
    );
}
