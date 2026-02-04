import { downloadZip } from "./exportZip";
import { generateSeparationPlates } from "../imaging/separations";
import type { ReductionResult } from "../../types/production";

export async function exportSeparationPlatesZip(params: {
    projectName: string;
    reducedLayerDataUrl: string;
    reduction: ReductionResult;
    addRegistrationMarks?: boolean;
}) {
    const plates = await generateSeparationPlates({
        reducedLayerDataUrl: params.reducedLayerDataUrl,
        colors: params.reduction.colors,
        addRegistrationMarks: params.addRegistrationMarks ?? true,
    });

    // coverage report text
    const report = [
        `Project: ${params.projectName}`,
        `Generated: ${new Date().toLocaleString()}`,
        ``,
        `Plate count: ${plates.length}`,
        ``,
        `Coverage report:`,
        ...plates.map((p, i) => `${i + 1}. ${p.hex} - ${p.coveragePercent.toFixed(2)}%`),
        ``,
    ].join("\n");

    await downloadZip({
        filename: `${params.projectName}-screen-plates.zip`,
        files: plates.map((p, idx) => ({
            name: `plate-${String(idx + 1).padStart(2, "0")}-${p.name}.png`,
            dataUrl: p.pngDataUrl,
        })),
        extraTextFiles: [
            { name: "coverage-report.txt", content: report },
            { name: "palette.json", content: JSON.stringify(params.reduction.colors, null, 2) },
        ],
    });
}
