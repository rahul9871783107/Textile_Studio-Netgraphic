/**
 * Image Processor Web Worker
 *
 * Handles heavy image processing operations off the main thread:
 * - Color recoloring
 * - Color reduction (k-means quantization)
 * - Large image exports
 */

// ============================================================================
// Types
// ============================================================================

type MessageType =
    | { type: "recolor"; id: string; imageData: ImageData; colorMap: Record<string, string> }
    | { type: "reduceColors"; id: string; imageData: ImageData; k: number }
    | { type: "processLargeExport"; id: string; imageData: ImageData; targetWidth: number; targetHeight: number };

type ResponseType =
    | { type: "recolor"; id: string; result: ImageData }
    | { type: "reduceColors"; id: string; result: { imageData: ImageData; colors: ColorInfo[] } }
    | { type: "processLargeExport"; id: string; result: ImageData }
    | { type: "progress"; id: string; progress: number; message: string }
    | { type: "error"; id: string; error: string };

type ColorInfo = {
    hex: string;
    count: number;
    percent: number;
};

// ============================================================================
// Utility Functions
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function sendProgress(id: string, progress: number, message: string): void {
    self.postMessage({ type: "progress", id, progress, message } as ResponseType);
}

// ============================================================================
// Recolor Processing
// ============================================================================

function recolorImageData(
    id: string,
    imageData: ImageData,
    colorMap: Record<string, string>
): ImageData {
    const data = imageData.data;
    const totalPixels = data.length / 4;

    // Pre-calculate map to int lookups for speed
    const lookups = new Map<number, { r: number; g: number; b: number }>();

    Object.entries(colorMap).forEach(([sourceHex, targetHex]) => {
        const s = hexToRgb(sourceHex);
        const t = hexToRgb(targetHex);
        const key = (s.r << 16) | (s.g << 8) | s.b;
        lookups.set(key, t);
    });

    if (lookups.size === 0) return imageData;

    sendProgress(id, 0, "Recoloring image...");

    // Process in chunks for progress updates
    const chunkSize = 100000;
    let processedPixels = 0;

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

        processedPixels++;
        if (processedPixels % chunkSize === 0) {
            sendProgress(id, Math.round((processedPixels / totalPixels) * 100), "Recoloring image...");
        }
    }

    sendProgress(id, 100, "Recoloring complete");
    return imageData;
}

// ============================================================================
// Color Reduction (K-Means Quantization)
// ============================================================================

type RGB = [number, number, number];

function reduceColorsKMeans(
    id: string,
    imageData: ImageData,
    k: number
): { imageData: ImageData; colors: ColorInfo[] } {
    const data = imageData.data;
    const totalPixels = data.length / 4;

    sendProgress(id, 0, "Extracting colors...");

    // Extract all pixels as RGB
    const pixels: RGB[] = [];
    for (let i = 0; i < data.length; i += 4) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    sendProgress(id, 10, "Initializing clusters...");

    // Initialize k centroids randomly from the pixels
    const centroids: RGB[] = [];
    const usedIndices = new Set<number>();
    while (centroids.length < k && centroids.length < pixels.length) {
        const idx = Math.floor(Math.random() * pixels.length);
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            centroids.push([...pixels[idx]]);
        }
    }

    sendProgress(id, 15, "Running k-means clustering...");

    // K-means iterations
    const maxIterations = 20;
    const assignments = new Array(pixels.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
        // Assign each pixel to nearest centroid
        for (let i = 0; i < pixels.length; i++) {
            let minDist = Infinity;
            let minIdx = 0;
            for (let j = 0; j < centroids.length; j++) {
                const dist =
                    (pixels[i][0] - centroids[j][0]) ** 2 +
                    (pixels[i][1] - centroids[j][1]) ** 2 +
                    (pixels[i][2] - centroids[j][2]) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    minIdx = j;
                }
            }
            assignments[i] = minIdx;
        }

        // Update centroids
        const sums: RGB[] = centroids.map(() => [0, 0, 0]);
        const counts = new Array(centroids.length).fill(0);

        for (let i = 0; i < pixels.length; i++) {
            const cluster = assignments[i];
            sums[cluster][0] += pixels[i][0];
            sums[cluster][1] += pixels[i][1];
            sums[cluster][2] += pixels[i][2];
            counts[cluster]++;
        }

        for (let j = 0; j < centroids.length; j++) {
            if (counts[j] > 0) {
                centroids[j][0] = Math.round(sums[j][0] / counts[j]);
                centroids[j][1] = Math.round(sums[j][1] / counts[j]);
                centroids[j][2] = Math.round(sums[j][2] / counts[j]);
            }
        }

        sendProgress(id, 15 + Math.round((iter / maxIterations) * 60), `K-means iteration ${iter + 1}/${maxIterations}`);
    }

    sendProgress(id, 80, "Applying reduced palette...");

    // Apply reduced colors to image data
    for (let i = 0; i < pixels.length; i++) {
        const cluster = assignments[i];
        const idx = i * 4;
        data[idx] = centroids[cluster][0];
        data[idx + 1] = centroids[cluster][1];
        data[idx + 2] = centroids[cluster][2];
    }

    sendProgress(id, 90, "Calculating color statistics...");

    // Calculate color statistics
    const colorCounts = new Map<string, number>();
    for (let i = 0; i < centroids.length; i++) {
        const hex = rgbToHex(centroids[i][0], centroids[i][1], centroids[i][2]);
        colorCounts.set(hex, 0);
    }

    for (let i = 0; i < assignments.length; i++) {
        const cluster = assignments[i];
        const hex = rgbToHex(centroids[cluster][0], centroids[cluster][1], centroids[cluster][2]);
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }

    const colors: ColorInfo[] = Array.from(colorCounts.entries())
        .map(([hex, count]) => ({
            hex,
            count,
            percent: (count / totalPixels) * 100,
        }))
        .sort((a, b) => b.count - a.count);

    sendProgress(id, 100, "Color reduction complete");

    return { imageData, colors };
}

// ============================================================================
// Large Export Processing
// ============================================================================

function processLargeExport(
    id: string,
    imageData: ImageData,
    targetWidth: number,
    targetHeight: number
): ImageData {
    sendProgress(id, 0, "Processing large export...");

    // For now, just return the image data as-is
    // This can be extended to handle resizing, format conversion, etc.

    sendProgress(id, 100, "Export processing complete");
    return imageData;
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = (event: MessageEvent<MessageType>) => {
    const message = event.data;

    try {
        switch (message.type) {
            case "recolor": {
                const result = recolorImageData(message.id, message.imageData, message.colorMap);
                self.postMessage({ type: "recolor", id: message.id, result } as ResponseType);
                break;
            }

            case "reduceColors": {
                const result = reduceColorsKMeans(message.id, message.imageData, message.k);
                self.postMessage({ type: "reduceColors", id: message.id, result } as ResponseType);
                break;
            }

            case "processLargeExport": {
                const result = processLargeExport(
                    message.id,
                    message.imageData,
                    message.targetWidth,
                    message.targetHeight
                );
                self.postMessage({ type: "processLargeExport", id: message.id, result } as ResponseType);
                break;
            }

            default:
                self.postMessage({
                    type: "error",
                    id: (message as { id?: string }).id || "unknown",
                    error: "Unknown message type",
                } as ResponseType);
        }
    } catch (error) {
        self.postMessage({
            type: "error",
            id: (message as { id?: string }).id || "unknown",
            error: error instanceof Error ? error.message : "Unknown error",
        } as ResponseType);
    }
};

// Export empty object to satisfy TypeScript module requirements
export {};
