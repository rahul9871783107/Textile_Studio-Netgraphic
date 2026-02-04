/**
 * Canvas utility functions with proper null checking.
 */

/**
 * Gets a 2D canvas context with proper null checking.
 * @throws Error if context is not available
 */
export function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas 2D context not available");
    }
    return ctx;
}

/**
 * Creates a canvas with a 2D context.
 * @throws Error if context is not available
 */
export function createCanvasWithContext(
    width: number,
    height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = getContext2D(canvas);
    return { canvas, ctx };
}
