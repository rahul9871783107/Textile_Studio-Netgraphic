import type { TuftModel } from "../../types/tuftModel";
import { nanoid } from "nanoid";

export function createDefaultTuftModel(): TuftModel {
    const width = 96;
    const height = 96;

    return {
        width,
        height,

        colorMap: new Uint8Array(width * height).fill(0),
        pileMap: new Uint8Array(width * height).fill(40),
        cutMap: new Uint8Array(width * height).fill(1),

        yarns: [
            { id: nanoid(), name: "Yarn 1", color: "#1f2937" },
            { id: nanoid(), name: "Yarn 2", color: "#9ca3af" },
        ],

        activeYarn: 0,
        activePile: 40,
        activeCut: true,

        view: { zoom: 1, panX: 0, panY: 0 },
    };
}
