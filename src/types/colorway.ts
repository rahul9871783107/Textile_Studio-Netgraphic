export type Colorway = {
    id: string;
    name: string;
    paletteId: string;
    createdAt: number;

    // mapping from source hex -> target hex
    // used in recolor engine
    colorMap: Record<string, string>;
};
