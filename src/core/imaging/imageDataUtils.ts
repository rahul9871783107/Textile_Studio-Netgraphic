/**
 * Helper to get a 2D canvas context with proper null checking.
 * @throws Error if context is not available
 */
function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas 2D context not available");
    }
    return ctx;
}

export async function dataUrlToImageBitmap(dataUrl: string): Promise<ImageBitmap> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return await createImageBitmap(blob);
}

export async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
    const bmp = await dataUrlToImageBitmap(dataUrl);
    // Ensure we handle non-integer dimensions if needed, but usually images are integer dims.
    // Using floor to be safe if generic scaling, but bmp.width is integer usually.
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = getContext2D(canvas);
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToDataUrl(imageData: ImageData): string {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = getContext2D(canvas);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}
