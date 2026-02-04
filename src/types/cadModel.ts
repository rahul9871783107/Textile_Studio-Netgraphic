export type GridCell = number; // index into symbol/yarn table

export type CADGridModel = {
    width: number;
    height: number;
    grid: Uint16Array; // width * height
    palette?: string[]; // yarns / colors
};

export type CADViewState = {
    zoom: number;
    panX: number;
    panY: number;
};

export type CADProjectState = {
    model: CADGridModel;
    view: CADViewState;
};

// Weave-specific extensions
export type WeaveModel = CADGridModel & {
    threading: Uint16Array; // width length
    treadling: Uint16Array; // height length
    tieUp: Uint16Array; // harness * treadles
    harnesses: number;
    treadles: number;
};

// Knit-specific extensions
export type KnitModel = CADGridModel & {
    stitchSymbols: string[]; // stitch type names
};

// Jacquard-specific extensions
export type JacquardModel = CADGridModel & {
    warpColors: string[];
    weftColors: string[];
};

// Tuft-specific extensions
export type TuftModel = CADGridModel & {
    pileHeights: number[]; // per palette index
    backingColor: string;
};
