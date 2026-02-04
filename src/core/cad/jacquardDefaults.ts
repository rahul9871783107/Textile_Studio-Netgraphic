import type { JacquardModel, WeaveStructure } from "../../types/jacquardModel";

/**
 * Create a plain weave structure
 */
export function createPlainWeave(): WeaveStructure {
    return {
        id: "plain",
        name: "Plain Weave",
        harnessCount: 2,
        treadleCount: 2,
        threading: new Uint8Array([0, 1]),
        treadling: new Uint8Array([0, 1]),
        tieUp: new Uint8Array([1, 0, 0, 1]),
    };
}

/**
 * Create a 2/2 twill structure
 */
export function createTwillWeave(): WeaveStructure {
    return {
        id: "twill",
        name: "2/2 Twill",
        harnessCount: 4,
        treadleCount: 4,
        threading: new Uint8Array([0, 1, 2, 3]),
        treadling: new Uint8Array([0, 1, 2, 3]),
        tieUp: new Uint8Array([
            1, 1, 0, 0,
            0, 1, 1, 0,
            0, 0, 1, 1,
            1, 0, 0, 1,
        ]),
    };
}

/**
 * Create a satin weave structure
 */
export function createSatinWeave(): WeaveStructure {
    return {
        id: "satin",
        name: "5-Harness Satin",
        harnessCount: 5,
        treadleCount: 5,
        threading: new Uint8Array([0, 1, 2, 3, 4]),
        treadling: new Uint8Array([0, 1, 2, 3, 4]),
        tieUp: new Uint8Array([
            1, 0, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 0, 1,
            0, 1, 0, 0, 0,
            0, 0, 0, 1, 0,
        ]),
    };
}

/**
 * Create a weft-faced structure (mostly weft showing)
 */
export function createWeftFaced(): WeaveStructure {
    return {
        id: "weft-faced",
        name: "Weft Faced",
        harnessCount: 2,
        treadleCount: 2,
        threading: new Uint8Array([0, 1]),
        treadling: new Uint8Array([0, 0]),
        tieUp: new Uint8Array([0, 0, 1, 1]),
    };
}

/**
 * Create a warp-faced structure (mostly warp showing)
 */
export function createWarpFaced(): WeaveStructure {
    return {
        id: "warp-faced",
        name: "Warp Faced",
        harnessCount: 2,
        treadleCount: 2,
        threading: new Uint8Array([0, 1]),
        treadling: new Uint8Array([0, 1]),
        tieUp: new Uint8Array([1, 1, 1, 1]),
    };
}

/**
 * Create default jacquard model with common structures
 */
export function createDefaultJacquardModel(options?: {
    width?: number;
    height?: number;
}): JacquardModel {
    const width = options?.width ?? 128;
    const height = options?.height ?? 128;

    // Default structures
    const structures: WeaveStructure[] = [
        createPlainWeave(),
        createTwillWeave(),
        createSatinWeave(),
        createWeftFaced(),
        createWarpFaced(),
    ];

    // Initialize grid to all plain weave (index 0)
    const grid = new Uint16Array(width * height);
    grid.fill(0);

    return {
        width,
        height,
        grid,
        structures,
        warpDensity: 40,
        weftDensity: 36,
        warpColors: Array(width).fill("#1e3a5f"),
        weftColors: Array(height).fill("#f5f5dc"),
        view: { zoom: 1, panX: 0, panY: 0 },
    };
}
