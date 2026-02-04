import type { KnitModel } from "../../types/knitModel";
import { getContext2D } from "../imaging/canvasUtils";

/**
 * Export knit stitch pattern as grayscale bitmap PNG
 * Each stitch value (0-3) maps to a grayscale intensity
 */
export function exportKnitBitmap(model: KnitModel): string {
    const canvas = document.createElement("canvas");
    canvas.width = model.wales;
    canvas.height = model.courses;
    const ctx = getContext2D(canvas);
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < model.grid.length; i++) {
        // Map stitch values (0-3) to grayscale levels
        // 0: Knit = dark (0), 1: Tuck = medium-dark (80), 2: Miss = white (255), 3: Float = medium (160)
        const v = model.grid[i];
        let gray: number;
        switch (v) {
            case 0: gray = 0; break;    // Knit - black
            case 1: gray = 80; break;   // Tuck - dark gray
            case 2: gray = 255; break;  // Miss - white
            case 3: gray = 160; break;  // Float - light gray
            default: gray = 0;
        }
        img.data[i * 4] = gray;
        img.data[i * 4 + 1] = gray;
        img.data[i * 4 + 2] = gray;
        img.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Export knit pattern as structured JSON for machine instructions
 */
export function exportKnitJSON(model: KnitModel): string {
    return JSON.stringify(
        {
            wales: model.wales,
            courses: model.courses,
            stitches: Array.from(model.grid),
            yarns: model.yarns,
            stitchTypes: {
                0: "Knit",
                1: "Tuck",
                2: "Miss",
                3: "Float",
            },
        },
        null,
        2
    );
}
