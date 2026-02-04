export type ReducedColor = {
    hex: string;
    count: number;
    percent: number;
};

export type ReductionResult = {
    width: number;
    height: number;
    colors: ReducedColor[];
    colorCount: number;

    // base64 PNG of quantized image
    dataUrl: string;
};
