import { useEffect, useRef, useMemo } from "react";
import type { JacquardModel } from "../../types/jacquardModel";
import { generateJacquardDrawdown } from "../../core/cad/jacquardDrawdown";

type Props = {
    model: JacquardModel;
    cellSize?: number;
    showStructures?: boolean; // Show structure colors instead of fabric sim
    onCellClick?: (x: number, y: number) => void;
};

// Structure colors for visualization
const STRUCTURE_COLORS = [
    "#f8fafc", // Plain - light
    "#3b82f6", // Twill - blue
    "#ef4444", // Satin - red
    "#22c55e", // Weft-faced - green
    "#f59e0b", // Warp-faced - amber
    "#8b5cf6", // Extra 1 - purple
    "#ec4899", // Extra 2 - pink
    "#06b6d4", // Extra 3 - cyan
];

export default function JacquardCanvas({
    model,
    cellSize = 4,
    showStructures = false,
    onCellClick,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { width, height, grid, warpColors, weftColors, structures } = model;

    const canvasWidth = width * cellSize;
    const canvasHeight = height * cellSize;

    // Generate drawdown for fabric simulation
    const drawdown = useMemo(
        () => generateJacquardDrawdown(model),
        [model]
    );

    // Memoize image data
    const imageData = useMemo(() => {
        const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let color: string;

                if (showStructures) {
                    // Show structure assignment colors
                    const structIdx = grid[y * width + x];
                    color = STRUCTURE_COLORS[structIdx % STRUCTURE_COLORS.length];
                } else {
                    // Show fabric simulation
                    const isWarpUp = drawdown[y * width + x] === 1;
                    color = isWarpUp
                        ? warpColors[x % warpColors.length] ?? "#1e3a5f"
                        : weftColors[y % weftColors.length] ?? "#f5f5dc";
                }

                // Parse hex color
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);

                // Fill cell
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
    }, [drawdown, grid, width, height, warpColors, weftColors, cellSize, showStructures, canvasWidth, canvasHeight, structures]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.putImageData(imageData, 0, 0);
    }, [imageData, canvasWidth, canvasHeight]);

    function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!onCellClick) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX / cellSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / cellSize);

        if (x >= 0 && x < width && y >= 0 && y < height) {
            onCellClick(x, y);
        }
    }

    return (
        <canvas
            ref={canvasRef}
            onClick={handleClick}
            style={{
                border: "1px solid #d1d5db",
                imageRendering: "pixelated",
                cursor: onCellClick ? "crosshair" : "default",
                maxWidth: "100%",
            }}
        />
    );
}
