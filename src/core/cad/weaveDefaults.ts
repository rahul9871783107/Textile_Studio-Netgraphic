import type { WeaveModel } from "../../types/weaveModel";

/**
 * Create a default weave model with plain weave pattern
 */
export function createDefaultWeaveModel(options?: {
    warpCount?: number;
    weftCount?: number;
    harnessCount?: number;
    treadleCount?: number;
}): WeaveModel {
    const warp = options?.warpCount ?? 64;
    const weft = options?.weftCount ?? 64;
    const harness = options?.harnessCount ?? 4;
    const treadle = options?.treadleCount ?? 4;

    // Default threading: straight draw (1,2,3,4,1,2,3,4...)
    const threading = new Uint8Array(warp);
    for (let i = 0; i < warp; i++) {
        threading[i] = i % harness;
    }

    // Default treadling: straight treadling (1,2,3,4,1,2,3,4...)
    const treadling = new Uint8Array(weft);
    for (let i = 0; i < weft; i++) {
        treadling[i] = i % treadle;
    }

    // Default tie-up: plain weave (diagonal)
    const tieUp = new Uint8Array(harness * treadle);
    for (let h = 0; h < harness; h++) {
        for (let t = 0; t < treadle; t++) {
            // Plain weave: odd harnesses on odd treadles, even on even
            tieUp[h * treadle + t] = h === t ? 1 : 0;
        }
    }

    // Default colors
    const warpColors = Array(warp).fill("#1e3a5f"); // Dark blue warp
    const weftColors = Array(weft).fill("#f5f5dc"); // Cream weft

    return {
        warpCount: warp,
        weftCount: weft,
        harnessCount: harness,
        treadleCount: treadle,
        threading,
        treadling,
        tieUp,
        warpColors,
        weftColors,

        // 12A enhancements
        repeat: { warp: 1, weft: 1 },
        symmetry: { warpMirror: false, weftMirror: false },
        loom: {
            maxHarness: 16,
            maxTreadle: 16,
            maxWarp: 4096,
            maxWeft: 4096,
        },
    };
}

/**
 * Create a twill weave tie-up
 */
export function createTwillTieUp(harness: number, treadle: number): Uint8Array {
    const tieUp = new Uint8Array(harness * treadle);
    for (let h = 0; h < harness; h++) {
        for (let t = 0; t < treadle; t++) {
            // 2/2 twill: 2 up, 2 down, shifted
            const shift = t;
            const pos = (h + shift) % harness;
            tieUp[h * treadle + t] = pos < 2 ? 1 : 0;
        }
    }
    return tieUp;
}

/**
 * Create a satin weave tie-up
 */
export function createSatinTieUp(harness: number, treadle: number, skip = 2): Uint8Array {
    const tieUp = new Uint8Array(harness * treadle);
    for (let t = 0; t < treadle; t++) {
        const h = (t * skip) % harness;
        tieUp[h * treadle + t] = 1;
    }
    return tieUp;
}
