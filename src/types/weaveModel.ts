/**
 * Weave Model for draft-based weaving (Dobby looms)
 * 
 * Standard 4-part draft structure:
 * - Threading: warp → harness mapping
 * - Treadling: weft → treadle mapping  
 * - Tie-up: harness ↔ treadle connections
 * - Drawdown: computed from above (warp up/down pattern)
 */
export type WeaveModel = {
    warpCount: number;
    weftCount: number;

    harnessCount: number;
    treadleCount: number;

    // warp index → harness index (0-based)
    threading: Uint8Array; // length = warpCount

    // weft index → treadle index (0-based)
    treadling: Uint8Array; // length = weftCount

    // tieUp[harness * treadleCount + treadle] = 1 if harness lifts on treadle
    tieUp: Uint8Array; // size = harnessCount * treadleCount

    // yarn colors per end/pick
    warpColors: string[]; // length = warpCount
    weftColors: string[]; // length = weftCount

    // Repeat settings (12A enhancement)
    repeat: {
        warp: number; // horizontal repeat multiplier
        weft: number; // vertical repeat multiplier
    };

    // Symmetry settings (12A enhancement)
    symmetry: {
        warpMirror: boolean; // mirror warp on alternate repeats
        weftMirror: boolean; // mirror weft on alternate repeats
    };

    // Loom constraints (12A enhancement)
    loom: {
        maxHarness: number;
        maxTreadle: number;
        maxWarp: number;
        maxWeft: number;
    };
};

/**
 * Weave project editor state
 */
export type WeaveEditorState = {
    model: WeaveModel;
    view: {
        zoom: number;
        cellSize: number;
    };
};
