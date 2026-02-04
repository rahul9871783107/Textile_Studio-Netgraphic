import { useRef, useEffect, useCallback } from "react";
import { idx } from "../../core/cad/gridUtils";

type Props = {
    model: {
        width: number;
        height: number;
        grid: Uint16Array;
        palette?: string[];
    };
    cellSize?: number;
    showGrid?: boolean;
    onCellChange?: (x: number, y: number, value: number) => void;
    onCellClick?: (x: number, y: number, currentValue: number) => void;
    activeValue?: number;
};

export default function CADGrid({
    model,
    cellSize = 16,
    showGrid = true,
    onCellChange,
    onCellClick,
    activeValue = 1,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const w = model.width * cellSize;
    const h = model.height * cellSize;

    const defaultPalette = ["#ffffff", "#111827", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#8b5cf6", "#ec4899"];

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, w, h);

        // Draw cells
        for (let y = 0; y < model.height; y++) {
            for (let x = 0; x < model.width; x++) {
                const v = model.grid[idx(x, y, model.width)];
                const palette = model.palette ?? defaultPalette;
                ctx.fillStyle = palette[v % palette.length] ?? "#ffffff";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }

        // Draw grid lines
        if (showGrid) {
            ctx.strokeStyle = "#d1d5db";
            ctx.lineWidth = 1;

            for (let x = 0; x <= model.width; x++) {
                ctx.beginPath();
                ctx.moveTo(x * cellSize + 0.5, 0);
                ctx.lineTo(x * cellSize + 0.5, h);
                ctx.stroke();
            }

            for (let y = 0; y <= model.height; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * cellSize + 0.5);
                ctx.lineTo(w, y * cellSize + 0.5);
                ctx.stroke();
            }
        }
    }, [model, cellSize, showGrid, w, h]);

    useEffect(() => {
        draw();
    }, [draw]);

    function handleClick(e: React.MouseEvent) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / cellSize);
        const y = Math.floor((e.clientY - rect.top) / cellSize);

        if (x < 0 || y < 0 || x >= model.width || y >= model.height) return;

        const currentValue = model.grid[idx(x, y, model.width)];

        if (onCellClick) {
            onCellClick(x, y, currentValue);
        }

        if (onCellChange) {
            // Toggle: if already active value, set to 0; otherwise set to active value
            const newValue = currentValue === activeValue ? 0 : activeValue;
            onCellChange(x, y, newValue);
        }
    }

    function handleMouseMove(e: React.MouseEvent) {
        if (e.buttons !== 1) return; // Only on left button drag
        handleClick(e);
    }

    return (
        <canvas
            ref={canvasRef}
            width={w}
            height={h}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            style={{
                border: "1px solid #d1d5db",
                cursor: "crosshair",
                imageRendering: "pixelated",
            }}
        />
    );
}
