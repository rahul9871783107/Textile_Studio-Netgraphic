import jsPDF from "jspdf";
import type { Collection, CollectionItem } from "../../types/collection";
import type { ProjectRow } from "../../types/project";
import { downloadZip } from "./exportZip";
import { getContext2D } from "../imaging/canvasUtils";

async function renderProjectPreview(project: ProjectRow): Promise<string> {
    // We use existing stage export meta if project is open,
    // but for collections we render project thumbnail if available.
    // Minimal v1: return project.thumbnail or placeholder.
    if (project.thumbnail) return project.thumbnail;

    // fallback placeholder
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = getContext2D(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#6b7280";
    ctx.font = "20px system-ui";
    ctx.fillText(project.name, 40, 80);
    return canvas.toDataURL("image/png");
}

export async function exportCollectionLineSheetZip(params: {
    collection: Collection;
    items: CollectionItem[];
    projects: ProjectRow[];

    columns?: number;
}): Promise<void> {
    const columns = params.columns ?? 2;
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 32;

    pdf.setFontSize(18);
    pdf.text(params.collection.name, margin, 40);

    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 58);

    const cellGap = 14;
    const usableW = pageW - margin * 2;
    const cellW = (usableW - cellGap * (columns - 1)) / columns;
    const imgW = cellW;
    const imgH = imgW;

    let x = margin;
    let y = 80;
    let col = 0;

    const previews: { name: string; dataUrl: string }[] = [];

    for (let i = 0; i < params.items.length; i++) {
        const it = params.items[i];
        const proj = params.projects.find((p) => p.id === it.projectId);
        if (!proj) continue;

        const preview = await renderProjectPreview(proj);
        previews.push({ name: `previews/${proj.name.replace(/[^a-z0-9-_]/gi, "_")}.png`, dataUrl: preview });

        // Add new page if needed
        if (y + imgH + 80 > pageH) {
            pdf.addPage();
            x = margin;
            y = margin;
            col = 0;
        }

        // draw image
        pdf.addImage(preview, "PNG", x, y, imgW, imgH);

        // meta text
        pdf.setFontSize(12);
        pdf.text(proj.name, x, y + imgH + 16);

        pdf.setFontSize(9);
        const meta = `Repeat: ${proj.editorState.repeatMode} | Tile: ${proj.editorState.tileWidth}×${proj.editorState.tileHeight}px`;
        pdf.text(meta, x, y + imgH + 30);

        if (it.note) {
            pdf.text(`Note: ${it.note}`, x, y + imgH + 44);
        }

        // position update
        col++;
        if (col >= columns) {
            col = 0;
            x = margin;
            y += imgH + 72;
        } else {
            x += cellW + cellGap;
        }
    }

    // save pdf to dataurl
    // const pdfBlob = pdf.output("blob");

    // export ZIP
    await downloadZip({
        filename: `${params.collection.name}-line-sheet.zip`,
        files: [
            // NOTE: zip helper currently expects dataUrl.
            // We will add blob support in Prompt 8.1 if needed.
        ],
        extraTextFiles: [
            { name: "collection.json", content: JSON.stringify(params.collection, null, 2) },
            { name: "items.json", content: JSON.stringify(params.items, null, 2) },
        ],
    });

    // immediate download of pdf itself (simpler MVP)
    pdf.save(`${params.collection.name}-line-sheet.pdf`);
}
