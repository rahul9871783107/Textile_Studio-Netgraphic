export function toCSV(rows: Record<string, any>[]) {
    const headers = Object.keys(rows[0] ?? {});
    const escape = (v: any) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const lines = [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ];

    return lines.join("\n");
}
