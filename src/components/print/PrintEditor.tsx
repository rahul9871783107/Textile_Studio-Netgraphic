import type { ProjectRow } from "../../types/project";

/**
 * Print Editor - The existing raster-based textile print design editor.
 * This is a placeholder that will integrate with the existing App.tsx layout.
 * For now, it just indicates that the print mode is active.
 */
export default function PrintEditor({ project }: { project: ProjectRow }) {
    return (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#111827" }}>
                Print / Surface Design
            </h2>
            <p style={{ marginTop: 8 }}>
                Project: <strong>{project.name}</strong>
            </p>
            <p style={{ fontSize: "0.85rem", marginTop: 12 }}>
                The Print editor uses the main canvas and layer system.
                <br />
                This view is shown when accessed via ModuleRouter.
            </p>
        </div>
    );
}
