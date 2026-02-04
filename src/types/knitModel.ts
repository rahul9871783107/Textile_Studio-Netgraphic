export type StitchType = 0 | 1 | 2 | 3;
// 0: Knit, 1: Tuck, 2: Miss, 3: Float

export type KnitModel = {
    wales: number;   // columns
    courses: number; // rows

    // grid index -> StitchType
    grid: Uint8Array; // length = wales * courses

    // yarn colors per feeder (simple MVP: single yarn)
    yarns: {
        id: string;
        color: string;
    }[];

    activeYarnId: string;

    // view
    view: {
        zoom: number;
        panX: number;
        panY: number;
    };
};

/**
 * Knit project editor state
 */
export type KnitEditorState = {
    model: KnitModel;
};
