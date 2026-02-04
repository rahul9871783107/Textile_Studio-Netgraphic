import type { WeaveModel } from "../../types/weaveModel";

/**
 * Export weave model to WIF (Weaving Information File) format
 * 
 * WIF is an industry-standard text format for weave drafts.
 * Compatible with most weaving software (Fiberworks, WeaveIt, etc.)
 */
export function exportWIF(model: WeaveModel, projectName = "Untitled"): string {
    const lines: string[] = [];

    // Header
    lines.push("[WIF]");
    lines.push("Version=1.1");
    lines.push("Date=" + new Date().toISOString().split("T")[0]);
    lines.push("Developers=Textile Studio");
    lines.push("Source Program=Textile Studio - Netgraphic");

    lines.push("");
    lines.push("[CONTENTS]");
    lines.push("COLOR PALETTE=yes");
    lines.push("TEXT=yes");
    lines.push("WEAVING=yes");
    lines.push("WARP=yes");
    lines.push("WEFT=yes");
    lines.push("COLOR TABLE=yes");
    lines.push("THREADING=yes");
    lines.push("TIEUP=yes");
    lines.push("TREADLING=yes");

    lines.push("");
    lines.push("[TEXT]");
    lines.push(`Title=${projectName}`);
    lines.push(`Author=Textile Studio User`);

    lines.push("");
    lines.push("[WEAVING]");
    lines.push(`Shafts=${model.harnessCount}`);
    lines.push(`Treadles=${model.treadleCount}`);
    lines.push("Rising Shed=yes");

    lines.push("");
    lines.push("[WARP]");
    lines.push(`Threads=${model.warpCount}`);
    lines.push("Units=centimeters");

    lines.push("");
    lines.push("[WEFT]");
    lines.push(`Threads=${model.weftCount}`);
    lines.push("Units=centimeters");

    // Color table - build from unique colors
    const allColors = [...new Set([...model.warpColors, ...model.weftColors])];
    const colorIndex = new Map<string, number>();
    allColors.forEach((c, i) => colorIndex.set(c, i + 1));

    lines.push("");
    lines.push("[COLOR TABLE]");
    allColors.forEach((color, i) => {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        lines.push(`${i + 1}=${r},${g},${b}`);
    });

    // Threading: warp index → harness (1-based)
    lines.push("");
    lines.push("[THREADING]");
    model.threading.forEach((harness, i) => {
        lines.push(`${i + 1}=${harness + 1}`);
    });

    // Warp colors
    lines.push("");
    lines.push("[WARP COLORS]");
    model.warpColors.forEach((color, i) => {
        const idx = colorIndex.get(color) ?? 1;
        lines.push(`${i + 1}=${idx}`);
    });

    // Treadling: weft index → treadle (1-based)
    lines.push("");
    lines.push("[TREADLING]");
    model.treadling.forEach((treadle, i) => {
        lines.push(`${i + 1}=${treadle + 1}`);
    });

    // Weft colors
    lines.push("");
    lines.push("[WEFT COLORS]");
    model.weftColors.forEach((color, i) => {
        const idx = colorIndex.get(color) ?? 1;
        lines.push(`${i + 1}=${idx}`);
    });

    // Tie-up: harness,treadle pairs that are connected
    lines.push("");
    lines.push("[TIEUP]");
    for (let t = 0; t < model.treadleCount; t++) {
        const lifts: number[] = [];
        for (let h = 0; h < model.harnessCount; h++) {
            const v = model.tieUp[h * model.treadleCount + t];
            if (v) lifts.push(h + 1);
        }
        if (lifts.length > 0) {
            lines.push(`${t + 1}=${lifts.join(",")}`);
        }
    }

    return lines.join("\n");
}

/**
 * Download WIF file
 */
export function downloadWIF(model: WeaveModel, projectName = "weave"): void {
    const content = exportWIF(model, projectName);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName}.wif`;
    link.click();

    URL.revokeObjectURL(url);
}
