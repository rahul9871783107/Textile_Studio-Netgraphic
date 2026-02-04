/**
 * Calculate grid index from x,y coordinates
 */
export function knitIdx(x: number, y: number, wales: number): number {
    return y * wales + x;
}

/**
 * Resize knit grid preserving existing data
 */
export function resizeKnitGrid(
    oldGrid: Uint8Array,
    oldW: number,
    oldH: number,
    newW: number,
    newH: number
): Uint8Array {
    const next = new Uint8Array(newW * newH).fill(0);
    for (let y = 0; y < Math.min(oldH, newH); y++) {
        for (let x = 0; x < Math.min(oldW, newW); x++) {
            next[y * newW + x] = oldGrid[y * oldW + x];
        }
    }
    return next;
}
