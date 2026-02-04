import { useEffect, useRef, useCallback } from "react";
import type { TuftModel } from "../../types/tuftModel";

interface TuftCanvasProps {
    model: TuftModel;
    cell?: number;
    onCellPaint?: (x: number, y: number) => void;
}

export default function TuftCanvas({
    model,
    cell = 8,
    onCellPaint,
}: TuftCanvasProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    const isPaintingRef = useRef(false);

    useEffect(() => {
        const c = ref.current;
        if (!c) return;

        c.width = model.width * cell;
        c.height = model.height * cell;
        const ctx = c.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, c.width, c.height);

        for (let y = 0; y < model.height; y++) {
            for (let x = 0; x < model.width; x++) {
                const i = y * model.width + x;

                const yarnIdx = model.colorMap[i] ?? 0;
                const yarn = model.yarns[yarnIdx] ?? model.yarns[0];
                const pile = model.pileMap[i] ?? 40;
                const cut = model.cutMap[i] === 1;

                // base yarn color
                ctx.fillStyle = yarn?.color ?? "#1f2937";
                ctx.fillRect(x * cell, y * cell, cell, cell);

                // pile shading: cut = darker overlay, loop = lighter overlay
                const shade = pile / 100;
                ctx.fillStyle = cut
                    ? `rgba(0,0,0,${0.25 * shade})`
                    : `rgba(255,255,255,${0.2 * shade})`;
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
        }

        // grid lines
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= model.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cell, 0);
            ctx.lineTo(x * cell, c.height);
            ctx.stroke();
        }
        for (let y = 0; y <= model.height; y++) {
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
        if (!onCellPaint) return;
        isPaintingRef.current = true;

        const { x, y } = getCellFromEvent(e);
        if (x >= 0 && x < model.width && y >= 0 && y < model.height) {
            onCellPaint(x, y);
        }
    }, [onCellPaint, getCellFromEvent, model.width, model.height]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onCellPaint || !isPaintingRef.current) return;

        const { x, y } = getCellFromEvent(e);
        if (x >= 0 && x < model.width && y >= 0 && y < model.height) {
            onCellPaint(x, y);
        }
    }, [onCellPaint, getCellFromEvent, model.width, model.height]);

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
                cursor: onCellPaint ? "crosshair" : "default",
                touchAction: "none"
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
    );
}
