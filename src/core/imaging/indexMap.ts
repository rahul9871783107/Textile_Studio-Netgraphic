function hexToRgb(hex: string) {
    const h = hex.replace("#", "").trim();
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

export function buildPaletteRgb(paletteHex: string[]) {
    return paletteHex.map(hexToRgb);
}

export function pixelToPaletteIndex(params: {
    r: number;
    g: number;
    b: number;
    paletteRgb: { r: number; g: number; b: number }[];
}) {
    const { r, g, b, paletteRgb } = params;
    for (let i = 0; i < paletteRgb.length; i++) {
        const p = paletteRgb[i];
        if (p.r === r && p.g === g && p.b === b) return i;
    }
    return -1;
}
