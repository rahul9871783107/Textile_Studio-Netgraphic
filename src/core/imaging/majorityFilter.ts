import { dataUrlToImageData, imageDataToDataUrl } from "./imageDataUtils";

function rgbKey(r: number, g: number, b: number) {
    return `${r},${g},${b}`;
}

export async function majorityFilter(params: {
    reducedLayerDataUrl: string;
    passes: number; // 1..5
}): Promise<{ filteredDataUrl: string }> {
    const { reducedLayerDataUrl, passes } = params;

    let imageData = await dataUrlToImageData(reducedLayerDataUrl);

    const w = imageData.width;
    const h = imageData.height;

    const getPixel = (d: Uint8ClampedArray, x: number, y: number) => {
        const p = (y * w + x) * 4;
        return { r: d[p], g: d[p + 1], b: d[p + 2], a: d[p + 3] };
    };

    for (let pass = 0; pass < passes; pass++) {
        const src = imageData.data;
        const out = new Uint8ClampedArray(src.length);

        out.set(src);

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const center = getPixel(src, x, y);
                if (center.a < 20) continue;

                const counts = new Map<string, { rgb: any; count: number }>();

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const p = getPixel(src, x + dx, y + dy);
                        if (p.a < 20) continue;
                        const k = rgbKey(p.r, p.g, p.b);
                        counts.set(k, { rgb: p, count: (counts.get(k)?.count ?? 0) + 1 });
                    }
                }

                let best = { rgb: center, count: 0 };
                for (const v of counts.values()) {
                    if (v.count > best.count) best = v;
                }

                if (best.count >= 5) {
                    const p = (y * w + x) * 4;
                    out[p] = best.rgb.r;
                    out[p + 1] = best.rgb.g;
                    out[p + 2] = best.rgb.b;
                    out[p + 3] = 255;
                }
            }
        }

        imageData = new ImageData(out, w, h);
    }

    return { filteredDataUrl: imageDataToDataUrl(imageData) };
}
