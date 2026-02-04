import type { TuftModel } from "../../types/tuftModel";
import { getContext2D } from "../imaging/canvasUtils";

/**
 * Export tuft color map as grayscale bitmap PNG
 * Each yarn index maps to a grayscale level
 */
export function exportTuftColorMap(model: TuftModel): string {
    const canvas = document.createElement("canvas");
    canvas.width = model.width;
    canvas.height = model.height;
    const ctx = getContext2D(canvas);
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < model.colorMap.length; i++) {
        // Map yarn index to grayscale (spread across 256 levels)
        const v = model.colorMap[i] * (255 / Math.max(model.yarns.length - 1, 1));
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Export tuft pile height map as grayscale bitmap PNG
 */
export function exportTuftPileMap(model: TuftModel): string {
    const canvas = document.createElement("canvas");
    canvas.width = model.width;
    canvas.height = model.height;
    const ctx = getContext2D(canvas);
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < model.pileMap.length; i++) {
        const v = Math.floor((model.pileMap[i] / 100) * 255);
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Export tuft pattern as structured JSON for machine production
 */
export function exportTuftJSON(model: TuftModel): string {
    return JSON.stringify(
        {
            width: model.width,
            height: model.height,
            yarns: model.yarns,
            colorMap: Array.from(model.colorMap),
            pileMap: Array.from(model.pileMap),
            cutMap: Array.from(model.cutMap),
            metadata: {
                type: "tuft",
                version: "1.0",
                exportedAt: new Date().toISOString(),
            }
        },
        null,
        2
    );
}
