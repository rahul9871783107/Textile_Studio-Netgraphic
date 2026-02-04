/**
 * Image Processor Client
 *
 * Provides a Promise-based API for communicating with the image processor worker.
 * Handles worker lifecycle, progress tracking, and error handling.
 */

import { create } from "zustand";
import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

export type ColorInfo = {
    hex: string;
    count: number;
    percent: number;
};

export type ProcessingProgress = {
    isProcessing: boolean;
    progress: number;
    message: string;
    taskId: string | null;
};

type PendingTask = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
};

// ============================================================================
// Progress Store
// ============================================================================

type ProcessingStore = {
    isProcessing: boolean;
    progress: number;
    message: string;
    taskId: string | null;
    _setProcessing: (isProcessing: boolean, taskId?: string | null) => void;
    _setProgress: (progress: number, message: string) => void;
    _reset: () => void;
};

export const useProcessingStore = create<ProcessingStore>((set) => ({
    isProcessing: false,
    progress: 0,
    message: "",
    taskId: null,
    _setProcessing: (isProcessing, taskId = null) =>
        set({ isProcessing, taskId: isProcessing ? taskId : null }),
    _setProgress: (progress, message) => set({ progress, message }),
    _reset: () => set({ isProcessing: false, progress: 0, message: "", taskId: null }),
}));

// ============================================================================
// Worker Management
// ============================================================================

let worker: Worker | null = null;
const pendingTasks = new Map<string, PendingTask>();

function getWorker(): Worker {
    if (!worker) {
        // Vite handles the worker import with the ?worker suffix
        worker = new Worker(
            new URL("../../workers/imageProcessor.worker.ts", import.meta.url),
            { type: "module" }
        );

        worker.onmessage = (event) => {
            const message = event.data;

            if (message.type === "progress") {
                useProcessingStore.getState()._setProgress(message.progress, message.message);
                return;
            }

            if (message.type === "error") {
                const task = pendingTasks.get(message.id);
                if (task) {
                    task.reject(new Error(message.error));
                    pendingTasks.delete(message.id);
                }
                useProcessingStore.getState()._reset();
                return;
            }

            // Result message
            const task = pendingTasks.get(message.id);
            if (task) {
                task.resolve(message.result);
                pendingTasks.delete(message.id);
            }

            // Reset processing state if no more pending tasks
            if (pendingTasks.size === 0) {
                useProcessingStore.getState()._reset();
            }
        };

        worker.onerror = (error) => {
            console.error("[ImageProcessor] Worker error:", error);
            // Reject all pending tasks
            pendingTasks.forEach((task) => {
                task.reject(new Error("Worker error"));
            });
            pendingTasks.clear();
            useProcessingStore.getState()._reset();
        };
    }

    return worker;
}

/**
 * Terminates the worker. Call this when cleaning up.
 */
export function terminateWorker(): void {
    if (worker) {
        worker.terminate();
        worker = null;
        pendingTasks.clear();
        useProcessingStore.getState()._reset();
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts an HTMLImageElement to ImageData.
 */
export function imageToImageData(img: HTMLImageElement): ImageData {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Converts ImageData to a data URL.
 */
export function imageDataToDataUrl(imageData: ImageData): string {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Loads an image from a URL or data URL.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
    });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Recolors an image using the worker.
 *
 * @param img - The source image
 * @param colorMap - Map of source hex colors to target hex colors
 * @returns Promise resolving to the recolored image as a data URL
 */
export async function recolorImageWorker(
    img: HTMLImageElement,
    colorMap: Record<string, string>
): Promise<string> {
    // For small images or empty color maps, process on main thread
    const pixelCount = img.width * img.height;
    if (pixelCount < 100000 || Object.keys(colorMap).length === 0) {
        // Fall back to main thread processing for small images
        return recolorImageMainThread(img, colorMap);
    }

    const id = nanoid();
    const imageData = imageToImageData(img);

    useProcessingStore.getState()._setProcessing(true, id);
    useProcessingStore.getState()._setProgress(0, "Starting recolor...");

    const w = getWorker();

    return new Promise<string>((resolve, reject) => {
        pendingTasks.set(id, {
            resolve: (result) => {
                const dataUrl = imageDataToDataUrl(result as ImageData);
                resolve(dataUrl);
            },
            reject,
        });

        w.postMessage({
            type: "recolor",
            id,
            imageData,
            colorMap,
        });
    });
}

/**
 * Reduces colors in an image using k-means quantization.
 *
 * @param img - The source image
 * @param k - Target number of colors
 * @returns Promise resolving to the reduced image data URL and color info
 */
export async function reduceColorsWorker(
    img: HTMLImageElement,
    k: number
): Promise<{ dataUrl: string; colors: ColorInfo[] }> {
    const id = nanoid();
    const imageData = imageToImageData(img);

    useProcessingStore.getState()._setProcessing(true, id);
    useProcessingStore.getState()._setProgress(0, "Starting color reduction...");

    const w = getWorker();

    return new Promise((resolve, reject) => {
        pendingTasks.set(id, {
            resolve: (result: unknown) => {
                const typedResult = result as { imageData: ImageData; colors: ColorInfo[] };
                const dataUrl = imageDataToDataUrl(typedResult.imageData);
                resolve({ dataUrl, colors: typedResult.colors });
            },
            reject,
        });

        w.postMessage({
            type: "reduceColors",
            id,
            imageData,
            k,
        });
    });
}

/**
 * Processes a large image for export.
 *
 * @param img - The source image
 * @param targetWidth - Target width
 * @param targetHeight - Target height
 * @returns Promise resolving to the processed image data URL
 */
export async function processLargeExportWorker(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
): Promise<string> {
    const id = nanoid();
    const imageData = imageToImageData(img);

    useProcessingStore.getState()._setProcessing(true, id);
    useProcessingStore.getState()._setProgress(0, "Processing export...");

    const w = getWorker();

    return new Promise((resolve, reject) => {
        pendingTasks.set(id, {
            resolve: (result) => {
                const dataUrl = imageDataToDataUrl(result as ImageData);
                resolve(dataUrl);
            },
            reject,
        });

        w.postMessage({
            type: "processLargeExport",
            id,
            imageData,
            targetWidth,
            targetHeight,
        });
    });
}

// ============================================================================
// Fallback Main Thread Implementation
// ============================================================================

/**
 * Main thread fallback for recoloring small images.
 */
function recolorImageMainThread(
    img: HTMLImageElement,
    colorMap: Record<string, string>
): string {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.drawImage(img, 0, 0);

    if (Object.keys(colorMap).length === 0) {
        return canvas.toDataURL();
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Pre-calculate lookups
    const lookups = new Map<number, { r: number; g: number; b: number }>();
    Object.entries(colorMap).forEach(([sourceHex, targetHex]) => {
        const s = hexToRgb(sourceHex);
        const t = hexToRgb(targetHex);
        const key = (s.r << 16) | (s.g << 8) | s.b;
        lookups.set(key, t);
    });

    for (let i = 0; i < data.length; i += 4) {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
}
