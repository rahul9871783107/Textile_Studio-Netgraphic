import JSZip from "jszip";

function dataUrlToUint8Array(dataUrl: string) {
    const base64 = dataUrl.split(",")[1];
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

export async function downloadZip(params: {
    filename: string;
    files: { name: string; dataUrl: string }[];
    extraTextFiles?: { name: string; content: string }[];
}) {
    const zip = new JSZip();

    for (const f of params.files) {
        zip.file(f.name, dataUrlToUint8Array(f.dataUrl));
    }

    for (const t of params.extraTextFiles ?? []) {
        zip.file(t.name, t.content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = params.filename;
    link.click();

    URL.revokeObjectURL(url);
}
