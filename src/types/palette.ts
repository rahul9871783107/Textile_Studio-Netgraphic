export type PaletteColor = {
    id: string;
    name: string;
    hex: string; // e.g. "#FF0000"
};

export type Palette = {
    id: string;
    name: string;
    colors: PaletteColor[];
    createdAt: number;
    updatedAt: number;
};
