import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nanoid } from "nanoid";

import type { ProjectRow } from "../types/project";
import type { ProjectType } from "../types/projectType";
import { PROJECT_TYPE_LABELS } from "../types/projectType";
import { useProjectStore } from "../store/useProjectStore";
import { useEditorStore } from "../store/useEditorStore";
import { deleteProject, getProject, upsertProject } from "../core/storage/projectRepo";

function newProjectRow(name: string, type: ProjectType): ProjectRow {
    const now = Date.now();
    return {
        id: nanoid(),
        name: name.trim() || "Untitled",
        type,
        createdAt: now,
        updatedAt: now,
        editorState: {
            layers: [],
            repeatMode: "straight",
            tileWidth: 1200,
            tileHeight: 1200,
        },
    };
}

export default function ProjectList() {
    const { projects, refresh, isLoading, error, clearError } = useProjectStore();
    const hydrateFromProject = useEditorStore((s) => s.hydrateFromProject);

    const [newProjectType, setNewProjectType] = useState<ProjectType>("print");

    useEffect(() => {
        refresh();
    }, [refresh]);

    const handleRetry = () => {
        clearError();
        refresh();
    };

    async function handleNewProject() {
        const name = window.prompt("Project name?", "Untitled Project");
        if (name === null) return;

        try {
            const row = newProjectRow(name, newProjectType);
            await upsertProject(row);
            await refresh();
            hydrateFromProject(row);
        } catch (err) {
            console.error("[ProjectList] Failed to create project:", err);
            alert("Failed to create project. Please try again.");
        }
    }

    async function handleOpenProject(id: string) {
        try {
            const project = await getProject(id);
            if (!project) return;
            // Ensure type field exists (migration safety for old projects)
            const safeProject = { ...project, type: project.type ?? "print" } as ProjectRow;
            hydrateFromProject(safeProject);
        } catch (err) {
            console.error("[ProjectList] Failed to open project:", err);
            alert("Failed to open project. Please try again.");
        }
    }

    async function handleDeleteProject(id: string) {
        const ok = window.confirm("Delete this project? This cannot be undone.");
        if (!ok) return;

        try {
            await deleteProject(id);
            await refresh();
        } catch (err) {
            console.error("[ProjectList] Failed to delete project:", err);
            alert("Failed to delete project. Please try again.");
        }
    }

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <select
                    className="select"
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value as ProjectType)}
                    style={{ minWidth: 120 }}
                >
                    {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((t) => (
                        <option key={t} value={t}>
                            {PROJECT_TYPE_LABELS[t]}
                        </option>
                    ))}
                </select>
                <button className="btn" onClick={handleNewProject}>
                    + New
                </button>
                <button className="btn btnGhost" onClick={refresh}>
                    Refresh
                </button>
            </div>

            {isLoading && <div className="projectMeta">Loading projects…</div>}

            {error && (
                <div className="hintCard" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
                    <div className="hintTitle" style={{ color: "#ef4444" }}>Failed to load projects</div>
                    <div className="hintText" style={{ marginBottom: 10 }}>{error}</div>
                    <button className="btn" onClick={handleRetry}>
                        Retry
                    </button>
                </div>
            )}

            {!isLoading && !error && projects.length === 0 && (
                <div className="hintCard">
                    <div className="hintTitle">No projects yet</div>
                    <div className="hintText">Select a type and click "New" to create your first project.</div>
                </div>
            )}

            {projects.map((p) => (
                <div key={p.id} className="projectItem" style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div>
                            <div className="projectName">{p.name}</div>
                            <div className="projectMeta">
                                <span className={`projectTypeBadge projectTypeBadge--${p.type ?? "print"}`}>
                                    {PROJECT_TYPE_LABELS[p.type ?? "print"]}
                                </span>
                                Updated {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btnGhost" onClick={() => handleOpenProject(p.id)}>
                                Open
                            </button>
                            <button className="btn btnGhost" onClick={() => handleDeleteProject(p.id)}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
