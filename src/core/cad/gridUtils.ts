/**
 * Create an empty grid filled with a default value
 */
export function createEmptyGrid(
    width: number,
    height: number,
    fill = 0
): Uint16Array {
    const arr = new Uint16Array(width * height);
    arr.fill(fill);
    return arr;
}

/**
 * Get linear index from x, y coordinates
 */
export function idx(x: number, y: number, w: number): number {
    return y * w + x;
}

/**
 * Get x, y from linear index
 */
export function fromIdx(index: number, w: number): { x: number; y: number } {
    return {
        x: index % w,
        y: Math.floor(index / w),
    };
}

/**
 * Clone a grid
 */
export function cloneGrid(grid: Uint16Array): Uint16Array {
    return new Uint16Array(grid);
}

/**
 * Resize a grid, preserving existing data where possible
 */
export function resizeGrid(
    grid: Uint16Array,
    oldWidth: number,
    oldHeight: number,
    newWidth: number,
    newHeight: number,
    fill = 0
): Uint16Array {
    const newGrid = new Uint16Array(newWidth * newHeight);
    newGrid.fill(fill);

    const copyW = Math.min(oldWidth, newWidth);
    const copyH = Math.min(oldHeight, newHeight);

    for (let y = 0; y < copyH; y++) {
        for (let x = 0; x < copyW; x++) {
            newGrid[idx(x, y, newWidth)] = grid[idx(x, y, oldWidth)];
        }
    }

    return newGrid;
}

/**
 * Fill a rectangular region of a grid
 */
export function fillGridRegion(
    grid: Uint16Array,
    width: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    value: number
): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            grid[idx(x, y, width)] = value;
        }
    }
}
