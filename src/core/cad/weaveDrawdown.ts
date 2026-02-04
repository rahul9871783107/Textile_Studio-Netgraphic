import type { WeaveModel } from "../../types/weaveModel";

/**
 * Generate drawdown from weave model
 * 
 * Drawdown rule:
 * A warp is UP (1) if its harness is tied to the treadle used by that pick
 * Otherwise weft shows (0)
 * 
 * Enhanced with repeat and symmetry support (12A)
 * 
 * @returns Uint8Array of size (warpCount * repeat.warp) * (weftCount * repeat.weft)
 *          1 = warp up (warp color shows)
 *          0 = weft up (weft color shows)
 */
export function generateDrawdown(model: WeaveModel): Uint8Array {
    const {
        warpCount,
        weftCount,
        threading,
        treadling,
        tieUp,
        treadleCount,
        repeat,
        symmetry,
    } = model;

    // Calculate output dimensions with repeat
    const outWidth = warpCount * (repeat?.warp ?? 1);
    const outHeight = weftCount * (repeat?.weft ?? 1);

    const drawdown = new Uint8Array(outWidth * outHeight);

    for (let y = 0; y < outHeight; y++) {
        for (let x = 0; x < outWidth; x++) {
            // Calculate base position within pattern
            let baseX = x % warpCount;
            let baseY = y % weftCount;

            // Apply warp mirror on alternate horizontal repeats
            if (symmetry?.warpMirror) {
                const repeatIdx = Math.floor(x / warpCount);
                if (repeatIdx % 2 === 1) {
                    baseX = warpCount - 1 - baseX;
                }
            }

            // Apply weft mirror on alternate vertical repeats
            if (symmetry?.weftMirror) {
                const repeatIdx = Math.floor(y / weftCount);
                if (repeatIdx % 2 === 1) {
                    baseY = weftCount - 1 - baseY;
                }
            }

            // Lookup threading and treadling
            const harness = threading[baseX];
            const treadle = treadling[baseY];

            // Calculate tie-up index and check lift
            const tieUpIdx = harness * treadleCount + treadle;
            const lift = tieUp[tieUpIdx];

            drawdown[y * outWidth + x] = lift ? 1 : 0;
        }
    }

    return drawdown;
}

/**
 * Generate drawdown dimensions (accounting for repeat)
 */
export function getDrawdownDimensions(model: WeaveModel): { width: number; height: number } {
    return {
        width: model.warpCount * (model.repeat?.warp ?? 1),
        height: model.weftCount * (model.repeat?.weft ?? 1),
    };
}

/**
 * Get color for a cell in the drawdown
 * @param isWarpUp - Whether warp is on top at this position
 * @param warpColor - Color of the warp thread
 * @param weftColor - Color of the weft thread
 */
export function getDrawdownCellColor(
    isWarpUp: boolean,
    warpColor: string,
    weftColor: string
): string {
    return isWarpUp ? warpColor : weftColor;
}

/**
 * Apply subtle shading for depth effect
 */
export function applyDepthShading(color: string, isWarp: boolean): string {
    // Parse hex
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Darken warp slightly, lighten weft
    const factor = isWarp ? 0.95 : 1.05;
    const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v * factor)));

    const rr = clamp(r).toString(16).padStart(2, "0");
    const gg = clamp(g).toString(16).padStart(2, "0");
    const bb = clamp(b).toString(16).padStart(2, "0");

    return `#${rr}${gg}${bb}`;
}
