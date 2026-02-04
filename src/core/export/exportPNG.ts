import { useEditorStore } from "../../store/useEditorStore";
import { recolorImage } from "../imaging/recolor";
import { getStageRef, getViewMeta } from "../canvas/stageRef";
import { resolveImageSource } from "../storage/imageStore";

/**
 * DPI to pixelRatio conversion:
 * 72 dpi is baseline -> ratio 1
 * 150 -> ~2.08
 * 300 -> ~4.16
 */
function dpiToPixelRatio(dpi: number) {
    return dpi / 72;
}

function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

/**
 * Load an image with a timeout.
 * @param src - Image source URL or data URL
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise that resolves with the loaded image or rejects on timeout/error
 */
function loadImageWithTimeout(src: string, timeoutMs = 30000): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Image failed to load within ${timeoutMs / 1000} seconds`));
        }, timeoutMs);

        img.onload = () => {
            if (timedOut) return;
            clearTimeout(timeoutId);
            resolve(img);
        };

        img.onerror = () => {
            if (timedOut) return;
            clearTimeout(timeoutId);
            reject(new Error("Image failed to load"));
        };

        img.src = src;
    });
}

export async function exportTilePNG({ dpi }: { dpi: number }) {
    const stage = getStageRef();
    if (!stage) {
        throw new Error("Stage not available. Please ensure the canvas is loaded.");
    }

    const state = useEditorStore.getState();
    const ratio = dpiToPixelRatio(dpi);

    const meta = getViewMeta();
    if (!meta) {
        throw new Error("View meta not available.");
    }

    const { tilePxRect } = meta;

    const dataUrl = stage.toDataURL({
        x: tilePxRect.x,
        y: tilePxRect.y,
        width: tilePxRect.width,
        height: tilePxRect.height,
        pixelRatio: ratio,
    });

    downloadDataUrl(dataUrl, `${state.projectName}-tile-${dpi}dpi.png`);
}

export async function exportRepeatSheetPNG({
    dpi,
    grid,
}: {
    dpi: number;
    grid: number;
}) {
    const stage = getStageRef();
    if (!stage) {
        throw new Error("Stage not available.");
    }

    const state = useEditorStore.getState();
    const ratio = dpiToPixelRatio(dpi);

    const meta = getViewMeta();
    if (!meta) {
        throw new Error("View meta not available.");
    }

    const { sheetPxRect } = meta;

    const dataUrl = stage.toDataURL({
        x: sheetPxRect.x,
        y: sheetPxRect.y,
        width: sheetPxRect.width,
        height: sheetPxRect.height,
        pixelRatio: ratio,
    });

    downloadDataUrl(dataUrl, `${state.projectName}-repeat-${grid}x${grid}-${dpi}dpi.png`);
}

export async function exportColorwaySheetPNG({ dpi: _dpi, r: _r, c }: { dpi: number; r: number; c: number }) {
    const state = useEditorStore.getState();
    const colorways = state.colorways;
    // const palettes = state.palettes; // unused

    if (colorways.length === 0) return;

    // We need to generate a tile for EACH colorway.
    // 1. Get the base image (from first visible layer for now - MVP)
    // In a real app we'd composite all layers.
    const layer = state.layers.find((l) => l.visible && l.type === 'image');
    if (!layer) {
        alert("No visible image layer to export.");
        return;
    }

    // Resolve blob reference to full image for export
    const fullImageSrc = await resolveImageSource(layer.src, true);
    const img = await loadImageWithTimeout(fullImageSrc, 30000);

    // 2. Setup the sheet canvas
    // Each cell will contain the tile image + label
    const cellW = state.tileWidth;
    const cellH = state.tileHeight;
    const labelH = 100; // height for label area
    const gap = 40;

    const cols = c;
    const rows = Math.ceil(colorways.length / cols);

    const sheetW = cols * cellW + (cols + 1) * gap;
    const sheetH = rows * (cellH + labelH) + (rows + 1) * gap;

    // Final canvas
    const canvas = document.createElement("canvas");
    canvas.width = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheetW, sheetH);

    // 3. Loop colorways and render
    for (let i = 0; i < colorways.length; i++) {
        const cw = colorways[i];
        const row = Math.floor(i / cols);
        const col = i % cols;

        const x = gap + col * (cellW + gap);
        const y = gap + row * (cellH + labelH + gap);

        // Recolor
        const recoloredDataUrl = await recolorImage(img, cw.colorMap);
        const cwImg = await loadImageWithTimeout(recoloredDataUrl, 30000);

        // Draw Image
        ctx.drawImage(cwImg, x, y, cellW, cellH);

        // Draw Border
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellW, cellH);

        // Draw Label (Name + Palette Chips)
        const labelY = y + cellH + 20;
        ctx.fillStyle = "#111827";
        ctx.font = "bold 24px Helvetica";
        // Fit text
        ctx.fillText(cw.name, x, labelY);

        // Draw chips
        const uniqueColors = new Set(Object.values(cw.colorMap));
        let chipX = x;
        const chipY = labelY + 15;

        uniqueColors.forEach((hex) => {
            ctx.fillStyle = hex as string;
            ctx.fillRect(chipX, chipY, 30, 30);
            ctx.strokeStyle = "#00000040";
            ctx.strokeRect(chipX, chipY, 30, 30);
            chipX += 36;
        });
    }

    // 4. Download
    downloadDataUrl(canvas.toDataURL("image/png"), `${state.projectName}-colorways.png`);
}
