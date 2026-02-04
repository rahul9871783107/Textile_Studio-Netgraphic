import { useEffect, useRef, useCallback } from "react";
import type { KnitModel, StitchType } from "../../types/knitModel";

interface KnitCanvasProps {
    model: KnitModel;
    cell?: number;
    activeStitch?: StitchType;
    onCellClick?: (x: number, y: number) => void;
}

export default function KnitCanvas({
    model,
    cell = 10,
    activeStitch,
    onCellClick,
}: KnitCanvasProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    const isPaintingRef = useRef(false);

    useEffect(() => {
        const c = ref.current;
        if (!c) return;

        c.width = model.wales * cell;
        c.height = model.courses * cell;
        const ctx = c.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, c.width, c.height);

        const yarnColor = model.yarns[0]?.color ?? "#111827";

        for (let y = 0; y < model.courses; y++) {
            for (let x = 0; x < model.wales; x++) {
                const v = model.grid[y * model.wales + x] as StitchType;
                const px = x * cell;
                const py = y * cell;

                // background
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(px, py, cell, cell);

                if (v === 0) {
                    // knit - solid loop (filled circle)
                    ctx.fillStyle = yarnColor;
                    ctx.beginPath();
                    ctx.arc(px + cell / 2, py + cell / 2, cell / 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (v === 1) {
                    // tuck - loop + hold (outlined square)
                    ctx.strokeStyle = yarnColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
                } else if (v === 2) {
                    // miss - no loop (empty, just background)
                    // already drawn white background
                } else if (v === 3) {
                    // float - horizontal float (line)
                    ctx.strokeStyle = yarnColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(px + 2, py + cell / 2);
                    ctx.lineTo(px + cell - 2, py + cell / 2);
                    ctx.stroke();
                }
            }
        }

        // grid lines
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        for (let x = 0; x <= model.wales; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cell, 0);
            ctx.lineTo(x * cell, c.height);
            ctx.stroke();
        }
        for (let y = 0; y <= model.courses; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cell);
            ctx.lineTo(c.width, y * cell);
            ctx.stroke();
        }
    }, [model, cell]);

    const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = ref.current;
        if (!canvas) return { x: -1, y: -1 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor(((e.clientX - rect.left) * scaleX) / cell);
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / cell);

        return { x, y };
    }, [cell]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onCellClick) return;
        isPaintingRef.current = true;

        const { x, y } = getCellFromEvent(e);
        if (x >= 0 && x < model.wales && y >= 0 && y < model.courses) {
            console.log("KnitCanvas: Painting cell", x, y);
            onCellClick(x, y);
        }
    }, [onCellClick, getCellFromEvent, model.wales, model.courses]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onCellClick || !isPaintingRef.current) return;

        const { x, y } = getCellFromEvent(e);
        if (x >= 0 && x < model.wales && y >= 0 && y < model.courses) {
            onCellClick(x, y);
        }
    }, [onCellClick, getCellFromEvent, model.wales, model.courses]);

    const handleMouseUp = useCallback(() => {
        isPaintingRef.current = false;
    }, []);

    const handleMouseLeave = useCallback(() => {
        isPaintingRef.current = false;
    }, []);

    return (
        <canvas
            ref={ref}
            style={{
                border: "1px solid #d1d5db",
                cursor: onCellClick ? "crosshair" : "default",
                touchAction: "none"  // Prevent touch scrolling
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
    );
}

