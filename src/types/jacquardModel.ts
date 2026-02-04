/**
 * Jacquard CAD Model Types
 * 
 * Jacquard weaving assigns different weave structures to different regions
 * of the fabric, allowing complex patterns with multiple textures.
 */

/**
 * A weave structure that can be assigned to regions
 */
export type WeaveStructure = {
    id: string;
    name: string;
    harnessCount: number;
    treadleCount: number;
    threading: Uint8Array;
    treadling: Uint8Array;
    tieUp: Uint8Array;
};

/**
 * Jacquard model for artwork → fabric conversion
 */
export type JacquardModel = {
    width: number;   // warp ends (columns)
    height: number;  // picks (rows)

    // Per-cell structure assignment
    // grid[y * width + x] = index into structures array
    grid: Uint16Array;

    // Available weave structures
    structures: WeaveStructure[];

    // Fabric density
    warpDensity: number; // ends per cm
    weftDensity: number; // picks per cm

    // Yarn colors for simulation
    warpColors: string[];
    weftColors: string[];

    // Source artwork (optional)
    sourceImage?: string; // dataUrl

    // View state
    view: {
        zoom: number;
        panX: number;
        panY: number;
    };
};

/**
 * Jacquard editor state stored in project
 */
export type JacquardEditorState = {
    model: JacquardModel;
};
