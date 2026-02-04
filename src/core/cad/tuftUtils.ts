/**
 * Calculate grid index from x,y coordinates
 */
export function tuftIdx(x: number, y: number, width: number): number {
    return y * width + x;
}

/**
 * Resize tuft grids preserving existing data
 */
export function resizeTuftGrids(
    colorMap: Uint8Array,
    pileMap: Uint8Array,
    cutMap: Uint8Array,
    oldW: number,
    oldH: number,
    newW: number,
    newH: number
): { colorMap: Uint8Array; pileMap: Uint8Array; cutMap: Uint8Array } {
    const newColorMap = new Uint8Array(newW * newH).fill(0);
    const newPileMap = new Uint8Array(newW * newH).fill(40);
    const newCutMap = new Uint8Array(newW * newH).fill(1);

    for (let y = 0; y < Math.min(oldH, newH); y++) {
        for (let x = 0; x < Math.min(oldW, newW); x++) {
            const oldIdx = y * oldW + x;
            const newIdx = y * newW + x;
            newColorMap[newIdx] = colorMap[oldIdx];
            newPileMap[newIdx] = pileMap[oldIdx];
            newCutMap[newIdx] = cutMap[oldIdx];
        }
    }

    return { colorMap: newColorMap, pileMap: newPileMap, cutMap: newCutMap };
}
