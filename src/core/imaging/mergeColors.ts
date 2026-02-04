import { dataUrlToImageData, imageDataToDataUrl } from "./imageDataUtils";

function hexToRgb(hex: string) {
    const h = hex.replace("#", "").trim();
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

export async function mergeColorInImage(params: {
    reducedLayerDataUrl: string;
    fromHex: string;
    toHex: string;
}): Promise<{ mergedDataUrl: string; changedPixels: number }> {
    const { reducedLayerDataUrl, fromHex, toHex } = params;

    const imageData = await dataUrlToImageData(reducedLayerDataUrl);
    const { width, height, data } = imageData;

    const from = hexToRgb(fromHex);
    const to = hexToRgb(toHex);

    let changedPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 20) continue;

        if (data[i] === from.r && data[i + 1] === from.g && data[i + 2] === from.b) {
            data[i] = to.r;
            data[i + 1] = to.g;
            data[i + 2] = to.b;
            data[i + 3] = 255;
            changedPixels++;
        }
    }

    return { mergedDataUrl: imageDataToDataUrl(imageData), changedPixels };
}
