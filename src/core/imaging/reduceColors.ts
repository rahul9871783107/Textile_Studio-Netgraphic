import { quantizeKMeans, rgbPaletteToHex } from "./quantizeKMeans";
import { dataUrlToImageData, imageDataToDataUrl } from "./imageDataUtils";
import { reduceColorsWorker, loadImage } from "./imageProcessorClient";
import type { ReductionResult } from "../../types/production";

// Threshold for using worker (100k pixels = ~316x316 image)
const WORKER_THRESHOLD_PIXELS = 100000;

export async function reduceColorsToLayer(params: {
    srcDataUrl: string;
    k: number;
}): Promise<ReductionResult> {
    const { srcDataUrl, k } = params;

    // Load image to check dimensions
    const img = await loadImage(srcDataUrl);
    const pixelCount = img.width * img.height;

    // For large images, use the worker
    if (pixelCount > WORKER_THRESHOLD_PIXELS) {
        const result = await reduceColorsWorker(img, k);
        return {
            width: img.width,
            height: img.height,
            colors: result.colors,
            colorCount: result.colors.length,
            dataUrl: result.dataUrl,
        };
    }

    // For small images, process on main thread
    return reduceColorsMainThread(srcDataUrl, k);
}

/**
 * Main thread implementation for small images.
 */
async function reduceColorsMainThread(srcDataUrl: string, k: number): Promise<ReductionResult> {
    const imageData = await dataUrlToImageData(srcDataUrl);
    const q = quantizeKMeans(imageData, { k, maxIters: 12, sampleStride: 5 });

    const hexPalette = rgbPaletteToHex(q.palette);

    // coverage
    const total = q.counts.reduce((a, b) => a + b, 0);
    const colors = hexPalette
        .map((hex, idx) => ({
            hex,
            count: q.counts[idx],
            percent: total === 0 ? 0 : (q.counts[idx] / total) * 100,
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);

    const dataUrl = imageDataToDataUrl(q.quantized);

    return {
        width: q.width,
        height: q.height,
        colors,
        colorCount: colors.length,
        dataUrl,
    };
}
