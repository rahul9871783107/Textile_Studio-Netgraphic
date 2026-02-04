import jsPDF from "jspdf";
import { useEditorStore } from "../../store/useEditorStore";
import { getStageRef, getViewMeta } from "../canvas/stageRef";

function dpiToPixelRatio(dpi: number) {
    return dpi / 72;
}

export async function exportLineSheetPDF({ dpi }: { dpi: number }) {
    const stage = getStageRef();
    const meta = getViewMeta();
    if (!stage || !meta) {
        throw new Error("Stage/meta not available. Please ensure the canvas is loaded.");
    }

    const s = useEditorStore.getState();
    const ratio = dpiToPixelRatio(dpi);

    const { sheetPxRect } = meta;

    // Export preview image of sheet
    const sheetDataUrl = stage.toDataURL({
        x: sheetPxRect.x,
        y: sheetPxRect.y,
        width: sheetPxRect.width,
        height: sheetPxRect.height,
        pixelRatio: ratio,
    });

    // PDF
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 36;

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(s.projectName, margin, 50);

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Repeat Mode: ${s.repeatMode}`, margin, 75);
    pdf.text(`Tile Size: ${s.tileWidth} × ${s.tileHeight} px`, margin, 92);
    pdf.text(`Export DPI: ${dpi}`, margin, 109);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 126);

    // Fit image into page
    const imgMaxW = pageW - margin * 2;
    const imgW = imgMaxW;
    const imgH = imgW; // square sheet preview

    pdf.addImage(sheetDataUrl, "PNG", margin, 150, imgW, imgH);

    pdf.save(`${s.projectName}-line-sheet.pdf`);
}
