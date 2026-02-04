import { downloadZip } from "./exportZip";
import { toCSV } from "./csv";
import { getContext2D } from "../imaging/canvasUtils";

function dpiToPixelRatio(dpi: number) {
    return dpi / 72;
}

export async function exportDigitalPackZip(params: {
    projectName: string;
    reducedLayerDataUrl: string;
    reduction: any; // ReductionResult
    dpi: number;
    meta: {
        repeatMode: string;
        tileWidth: number;
        tileHeight: number;
    };
}) {
    const ratio = dpiToPixelRatio(params.dpi);

    // Render high-res PNG from reduced layer
    // We do NOT rely on Konva stage here to avoid view offsets.
    // Instead we directly export the layer image itself.
    const res = await fetch(params.reducedLayerDataUrl);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * ratio);
    canvas.height = Math.round(bmp.height * ratio);

    const ctx = getContext2D(canvas);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

    const quantizedPngDataUrl = canvas.toDataURL("image/png");

    // palette JSON (from stored reduction meta)
    const paletteJson = JSON.stringify(params.reduction.colors ?? [], null, 2);

    // palette CSV
    const paletteCsv = toCSV(
        (params.reduction.colors ?? []).map((c: any, idx: number) => ({
            index: idx + 1,
            hex: c.hex,
            count: c.count,
            percent: Number(c.percent?.toFixed?.(4) ?? c.percent),
        }))
    );

    // report text
    const reportLines = [
        `Project: ${params.projectName}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Export DPI: ${params.dpi}`,
        ``,
        `Repeat Mode: ${params.meta.repeatMode}`,
        `Tile: ${params.meta.tileWidth} x ${params.meta.tileHeight} px`,
        ``,
        `Color Count: ${(params.reduction.colors ?? []).length}`,
        ``,
        `Coverage report:`,
        ...(params.reduction.colors ?? []).map(
            (c: any, i: number) => `${i + 1}. ${c.hex} - ${Number(c.percent).toFixed(2)}%`
        ),
        ``,
    ];

    const metadataJson = JSON.stringify(
        {
            projectName: params.projectName,
            generatedAt: new Date().toISOString(),
            exportDpi: params.dpi,
            repeatMode: params.meta.repeatMode,
            tile: { widthPx: params.meta.tileWidth, heightPx: params.meta.tileHeight },
            reduction: {
                width: params.reduction.width,
                height: params.reduction.height,
                colorCount: params.reduction.colorCount,
            },
        },
        null,
        2
    );

    await downloadZip({
        filename: `${params.projectName}-digital-pack.zip`,
        files: [
            { name: "quantized.png", dataUrl: quantizedPngDataUrl },
        ],
        extraTextFiles: [
            { name: "palette.json", content: paletteJson },
            { name: "palette.csv", content: paletteCsv },
            { name: "coverage-report.txt", content: reportLines.join("\n") },
            { name: "metadata.json", content: metadataJson },
        ],
    });
}
