import type { ReducedColor } from "../../types/production";
import { dataUrlToImageData } from "./imageDataUtils";
import { getContext2D } from "./canvasUtils";

function hexToRgb(hex: string) {
    const h = hex.replace("#", "").trim();
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
}

function isSameColor(r: number, g: number, b: number, rgb: { r: number; g: number; b: number }) {
    // Exact match for now, as reduction should produce exact palette matches
    return r === rgb.r && g === rgb.g && b === rgb.b;
}

export type SeparationPlate = {
    hex: string;
    name: string;
    width: number;
    height: number;
    pngDataUrl: string;
    coveragePercent: number;
};

/**
 * Generates separations from a quantized image.
 * Assumption: image contains ONLY palette colors exactly.
 */
export async function generateSeparationPlates(params: {
    reducedLayerDataUrl: string;
    colors: ReducedColor[]; // from reduction output
    addRegistrationMarks?: boolean;
}): Promise<SeparationPlate[]> {
    const { reducedLayerDataUrl, colors, addRegistrationMarks = true } = params;

    const imageData = await dataUrlToImageData(reducedLayerDataUrl);
    const { width, height, data } = imageData;

    const totalPixels = width * height;

    // Pre-build canvas helper
    const makePlateCanvas = () => {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        return c;
    };

    const plates: SeparationPlate[] = [];

    for (const c of colors) {
        const rgb = hexToRgb(c.hex);

        const plateCanvas = makePlateCanvas();
        const ctx = getContext2D(plateCanvas);
        const out = ctx.createImageData(width, height);

        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 20) continue; // Skip transparency

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const match = isSameColor(r, g, b, rgb);
            if (match) {
                // black ink = visible
                out.data[i] = 0;
                out.data[i + 1] = 0;
                out.data[i + 2] = 0;
                out.data[i + 3] = 255;
                count++;
            } else {
                // transparent
                out.data[i] = 0;
                out.data[i + 1] = 0;
                out.data[i + 2] = 0;
                out.data[i + 3] = 0;
            }
        }

        ctx.putImageData(out, 0, 0);

        if (addRegistrationMarks) {
            // simple corner marks
            ctx.save();
            ctx.strokeStyle = "black";
            ctx.lineWidth = Math.max(2, Math.floor(width / 600));

            const m = Math.max(10, Math.floor(width / 80));
            const len = Math.max(20, Math.floor(width / 25));

            // top-left
            ctx.beginPath();
            ctx.moveTo(m, m + len);
            ctx.lineTo(m, m);
            ctx.lineTo(m + len, m);
            ctx.stroke();

            // top-right
            ctx.beginPath();
            ctx.moveTo(width - m - len, m);
            ctx.lineTo(width - m, m);
            ctx.lineTo(width - m, m + len);
            ctx.stroke();

            // bottom-left
            ctx.beginPath();
            ctx.moveTo(m, height - m - len);
            ctx.lineTo(m, height - m);
            ctx.lineTo(m + len, height - m);
            ctx.stroke();

            // bottom-right
            ctx.beginPath();
            ctx.moveTo(width - m - len, height - m);
            ctx.lineTo(width - m, height - m);
            ctx.lineTo(width - m, height - m - len);
            ctx.stroke();

            ctx.restore();
        }

        const pngDataUrl = plateCanvas.toDataURL("image/png");
        plates.push({
            hex: c.hex,
            name: c.hex.replace("#", ""),
            width,
            height,
            pngDataUrl,
            coveragePercent: totalPixels > 0 ? (count / totalPixels) * 100 : 0,
        });
    }

    return plates;
}
