import { recolorImageWorker, loadImage } from "./imageProcessorClient";

// Threshold for using worker (100k pixels = ~316x316 image)
const WORKER_THRESHOLD_PIXELS = 100000;

// Helper to parsing hex
function hexToRgb(hex: string) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
}

/**
 * Recolors an image based on a map of Source Hex -> Target Hex
 * Using strict equality for now, but tolerance can be added.
 *
 * For large images (>100k pixels), processing is done in a Web Worker
 * to avoid blocking the main thread.
 */
export async function recolorImage(
    img: HTMLImageElement | HTMLCanvasElement,
    map: Record<string, string>
): Promise<string> {
    const pixelCount = img.width * img.height;

    // For large images, use the worker
    if (pixelCount > WORKER_THRESHOLD_PIXELS && Object.keys(map).length > 0) {
        // Worker expects HTMLImageElement, so convert canvas if needed
        let imageElement: HTMLImageElement;
        if (img instanceof HTMLCanvasElement) {
            imageElement = await loadImage(img.toDataURL());
        } else {
            imageElement = img;
        }
        return recolorImageWorker(imageElement, map);
    }

    // For small images, process on main thread
    return recolorImageMainThread(img, map);
}

/**
 * Main thread implementation for small images.
 */
function recolorImageMainThread(
    img: HTMLImageElement | HTMLCanvasElement,
    map: Record<string, string>
): string {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Pre-calculate map to int lookups for speed
    const lookups = new Map<number, { r: number, g: number, b: number }>();

    Object.entries(map).forEach(([sourceHex, targetHex]) => {
        const s = hexToRgb(sourceHex);
        const t = hexToRgb(targetHex);

        // Key is (r << 16) | (g << 8) | b
        const key = (s.r << 16) | (s.g << 8) | s.b;
        lookups.set(key, t);
    });

    if (lookups.size === 0) return canvas.toDataURL(); // no recolor needed

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const key = (r << 16) | (g << 8) | b;
        const target = lookups.get(key);

        if (target) {
            data[i] = target.r;
            data[i + 1] = target.g;
            data[i + 2] = target.b;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}
