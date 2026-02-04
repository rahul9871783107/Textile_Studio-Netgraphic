import type { JacquardModel } from "../../types/jacquardModel";

/**
 * Generate jacquard drawdown from model
 * 
 * For each cell, looks up the assigned weave structure and
 * determines if warp is up based on that structure's tie-up.
 * 
 * @returns Uint8Array where 1 = warp up, 0 = weft up
 */
export function generateJacquardDrawdown(model: JacquardModel): Uint8Array {
    const { width, height, grid, structures } = model;
    const drawdown = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cellIdx = y * width + x;
            const structIdx = grid[cellIdx] ?? 0;
            const s = structures[structIdx];

            if (!s) {
                // Invalid structure, default to warp up
                drawdown[cellIdx] = 1;
                continue;
            }

            // Calculate position within the structure's repeat
            const warpIdx = x % s.threading.length;
            const weftIdx = y % s.treadling.length;

            // Get harness and treadle
            const harness = s.threading[warpIdx];
            const treadle = s.treadling[weftIdx];

            // Look up tie-up
            const tieUpIdx = harness * s.treadleCount + treadle;
            const lift = s.tieUp[tieUpIdx];

            drawdown[cellIdx] = lift ? 1 : 0;
        }
    }

    return drawdown;
}

/**
 * Get the color for a jacquard drawdown cell
 */
export function getJacquardCellColor(
    model: JacquardModel,
    x: number,
    y: number,
    isWarpUp: boolean
): string {
    const warpColor = model.warpColors[x % model.warpColors.length] ?? "#1e3a5f";
    const weftColor = model.weftColors[y % model.weftColors.length] ?? "#f5f5dc";
    return isWarpUp ? warpColor : weftColor;
}

/**
 * Get structure statistics for a jacquard model
 */
export function getStructureStats(model: JacquardModel): Map<string, number> {
    const stats = new Map<string, number>();

    model.structures.forEach(s => stats.set(s.id, 0));

    for (let i = 0; i < model.grid.length; i++) {
        const idx = model.grid[i];
        const s = model.structures[idx];
        if (s) {
            stats.set(s.id, (stats.get(s.id) ?? 0) + 1);
        }
    }

    return stats;
}
