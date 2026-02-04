import type { KnitModel } from "../../types/knitModel";
import { nanoid } from "nanoid";

export function createDefaultKnitModel(): KnitModel {
    const wales = 48;
    const courses = 48;

    const yarnId = nanoid();

    return {
        wales,
        courses,
        grid: new Uint8Array(wales * courses).fill(0), // all knit

        yarns: [{ id: yarnId, color: "#111827" }],
        activeYarnId: yarnId,

        view: { zoom: 1, panX: 0, panY: 0 },
    };
}
