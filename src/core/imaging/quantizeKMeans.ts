type RGB = { r: number; g: number; b: number };

function clampByte(n: number) {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex({ r, g, b }: RGB) {
    const toHex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function dist2(a: RGB, b: RGB) {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
}

function randomInt(max: number) {
    return Math.floor(Math.random() * max);
}

function pickInitialCentroids(samples: RGB[], k: number): RGB[] {
    // simple random sampling (fast). Works well for textiles.
    const centroids: RGB[] = [];
    const used = new Set<number>();

    while (centroids.length < k && used.size < samples.length) {
        const idx = randomInt(samples.length);
        if (used.has(idx)) continue;
        used.add(idx);
        centroids.push({ ...samples[idx] });
    }

    // fallback duplicates if samples too small
    while (centroids.length < k) centroids.push({ ...samples[0] });

    return centroids;
}

function nearestCentroidIndex(p: RGB, centroids: RGB[]) {
    let best = 0;
    let bestD = Number.POSITIVE_INFINITY;
    for (let i = 0; i < centroids.length; i++) {
        const d = dist2(p, centroids[i]);
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return best;
}

export type QuantizeOptions = {
    k: number; // 2..24
    maxIters?: number; // default 12
    sampleStride?: number; // default 5 (pick every Nth pixel)
};

export type QuantizeResult = {
    width: number;
    height: number;
    quantized: ImageData;
    palette: RGB[];
    counts: number[]; // per palette index
};

export function quantizeKMeans(imageData: ImageData, opts: QuantizeOptions): QuantizeResult {
    const { data, width, height } = imageData;

    const k = Math.max(2, Math.min(24, Math.floor(opts.k)));
    const maxIters = opts.maxIters ?? 12;
    const stride = opts.sampleStride ?? 5;

    // 1) collect samples
    const samples: RGB[] = [];
    // skip transparent pixels
    for (let i = 0; i < data.length; i += 4 * stride) {
        const a = data[i + 3];
        if (a < 20) continue;
        samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    if (samples.length === 0) {
        // empty: return as is
        const palette = [{ r: 0, g: 0, b: 0 }];
        return {
            width,
            height,
            quantized: new ImageData(new Uint8ClampedArray(data), width, height),
            palette,
            counts: [width * height],
        };
    }

    // 2) init centroids
    let centroids = pickInitialCentroids(samples, k);

    // 3) k-means
    for (let iter = 0; iter < maxIters; iter++) {
        const sumR = new Array(k).fill(0);
        const sumG = new Array(k).fill(0);
        const sumB = new Array(k).fill(0);
        const count = new Array(k).fill(0);

        for (const p of samples) {
            const idx = nearestCentroidIndex(p, centroids);
            sumR[idx] += p.r;
            sumG[idx] += p.g;
            sumB[idx] += p.b;
            count[idx] += 1;
        }

        // update
        let moved = 0;
        const next = centroids.map((c, i) => {
            if (count[i] === 0) return c;
            const nr = sumR[i] / count[i];
            const ng = sumG[i] / count[i];
            const nb = sumB[i] / count[i];
            const nc = { r: nr, g: ng, b: nb };
            if (dist2(c, nc as any) > 5) moved++; // increased threshold slightly for stability? User provided code used > 1
            return { r: nr, g: ng, b: nb };
        });

        centroids = next.map((c) => ({
            r: clampByte(c.r),
            g: clampByte(c.g),
            b: clampByte(c.b),
        }));

        // stop early
        if (moved === 0) break;
    }

    // 4) apply quantization to all pixels
    const out = new Uint8ClampedArray(data.length);
    const counts = new Array(k).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 20) {
            // keep transparent
            out[i] = 0;
            out[i + 1] = 0;
            out[i + 2] = 0;
            out[i + 3] = 0;
            continue;
        }

        const p = { r: data[i], g: data[i + 1], b: data[i + 2] };
        const idx = nearestCentroidIndex(p, centroids);
        const c = centroids[idx];

        out[i] = c.r;
        out[i + 1] = c.g;
        out[i + 2] = c.b;
        out[i + 3] = 255;
        counts[idx] += 1;
    }

    return {
        width,
        height,
        quantized: new ImageData(out, width, height),
        palette: centroids,
        counts,
    };
}

export function rgbPaletteToHex(palette: RGB[]) {
    return palette.map(rgbToHex);
}
