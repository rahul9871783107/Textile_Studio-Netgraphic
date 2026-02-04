export type TuftCell = {
    colorIndex: number;
    pile: number;      // 0–100 (mm scaled)
    cut: boolean;      // true = cut, false = loop
};

export type TuftModel = {
    width: number;   // needles (X)
    height: number;  // rows (Y)

    // flattened grids
    colorMap: Uint8Array;   // index → yarn palette
    pileMap: Uint8Array;    // pile height (0-100)
    cutMap: Uint8Array;     // 1 = cut, 0 = loop

    yarns: {
        id: string;
        name: string;
        color: string;
    }[];

    activeYarn: number;
    activePile: number;
    activeCut: boolean;

    view: {
        zoom: number;
        panX: number;
        panY: number;
    };
};

/**
 * Tuft project editor state
 */
export type TuftEditorState = {
    model: TuftModel;
};
