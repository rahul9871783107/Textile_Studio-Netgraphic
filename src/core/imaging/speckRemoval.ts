import { dataUrlToImageData, imageDataToDataUrl } from "./imageDataUtils";
import { buildPaletteRgb, pixelToPaletteIndex } from "./indexMap";

type Point = { x: number; y: number };

function idx(x: number, y: number, w: number) {
    return y * w + x;
}

function neighbors4(x: number, y: number) {
    return [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
    ];
}

export async function removeSpecks(params: {
    reducedLayerDataUrl: string;
    paletteHex: string[];
    minClusterSize: number; // 20..500 etc
}): Promise<{ cleanedDataUrl: string; removedPixels: number }> {
    const { reducedLayerDataUrl, paletteHex, minClusterSize } = params;

    const imageData = await dataUrlToImageData(reducedLayerDataUrl);
    const { width: w, height: h, data } = imageData;

    const paletteRgb = buildPaletteRgb(paletteHex);

    // Build palette index map for pixels
    const map = new Int16Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const p = (y * w + x) * 4;
            const a = data[p + 3];
            if (a < 20) {
                map[idx(x, y, w)] = -1;
                continue;
            }
            map[idx(x, y, w)] = pixelToPaletteIndex({
                r: data[p],
                g: data[p + 1],
                b: data[p + 2],
                paletteRgb,
            });
        }
    }

    const visited = new Uint8Array(w * h);
    let removedPixels = 0;

    // Flood fill each cluster
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const start = idx(x, y, w);
            if (visited[start]) continue;

            const colorIndex = map[start];
            visited[start] = 1;

            if (colorIndex < 0) continue;

            const queue: Point[] = [{ x, y }];
            const cluster: Point[] = [{ x, y }];

            while (queue.length > 0) {
                const cur = queue.pop();
                if (!cur) break;
                for (const n of neighbors4(cur.x, cur.y)) {
                    if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) continue;
                    const ni = idx(n.x, n.y, w);
                    if (visited[ni]) continue;
                    visited[ni] = 1;

                    if (map[ni] === colorIndex) {
                        queue.push(n);
                        cluster.push(n);
                    }
                }
            }

            if (cluster.length >= minClusterSize) continue;

            // replace this small cluster with the most frequent surrounding color
            const borderCounts = new Map<number, number>();
            for (const pt of cluster) {
                for (const n of neighbors4(pt.x, pt.y)) {
                    if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) continue;
                    const ni = idx(n.x, n.y, w);
                    const c = map[ni];
                    if (c < 0 || c === colorIndex) continue;
                    borderCounts.set(c, (borderCounts.get(c) ?? 0) + 1);
                }
            }

            // choose replacement
            let replacement = colorIndex;
            let best = -1;
            for (const [c, cnt] of borderCounts.entries()) {
                if (cnt > best) {
                    best = cnt;
                    replacement = c;
                }
            }

            // apply replacement in imageData
            const repRgb = paletteRgb[replacement];
            for (const pt of cluster) {
                const p = (pt.y * w + pt.x) * 4;
                data[p] = repRgb.r;
                data[p + 1] = repRgb.g;
                data[p + 2] = repRgb.b;
                data[p + 3] = 255;
                removedPixels++;
            }
        }
    }

    return {
        cleanedDataUrl: imageDataToDataUrl(imageData),
        removedPixels,
    };
}
