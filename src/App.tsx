import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { showSuccess, showError } from "./components/Toast";
import "./App.css";

import ProjectList from "./components/ProjectList";
import LayerPanel from "./components/LayerPanel";
import RepeatPanel from "./components/RepeatPanel";
import PalettePanel from "./components/PalettePanel";
import RecolorPanel from "./components/RecolorPanel";
import ProductionPanel from "./components/ProductionPanel"; // Import ProductionPanel
import CleaningPanel from "./components/CleaningPanel"; // Import CleaningPanel
import CollectionPanel from "./components/CollectionPanel"; // Import CollectionPanel
import TilePreviewCanvas from "./components/TilePreviewCanvas";
import ModuleRouter from "./components/ModuleRouter";
import ExportModal from "./components/ExportModal";
import ProcessingIndicator from "./components/ProcessingIndicator";
import { ToastContainer } from "./components/Toast";
import { startAutosave, stopAutosave, useAutosaveStore } from "./core/storage/autosave";
import { getHasUnsavedChanges, markClean } from "./core/storage/unsavedChanges";
import { useEditorStore } from "./store/useEditorStore";
import { upsertProject, getProject } from "./core/storage/projectRepo";
import type { ProjectRow } from "./types/project";

export default function App() {
    const projectId = useEditorStore((s) => s.projectId);
    const projectName = useEditorStore((s) => s.projectName);
    const projectType = useEditorStore((s) => s.projectType);
    const serialize = useEditorStore((s) => s.serialize);

    // Keep a stable reference to editor state for CAD modules
    const editorStateRef = useRef<any>({});

    // Create a stable project object for CAD modules
    const cadProject = useMemo<ProjectRow | null>(() => {
        if (!projectId || projectType === "print") return null;
        return {
            id: projectId,
            name: projectName,
            type: projectType,
            createdAt: 0,
            updatedAt: 0,
            editorState: editorStateRef.current
        };
    }, [projectId, projectName, projectType]);

    const [exportOpen, setExportOpen] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);

    // Mobile menu state
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobilePanel, setMobilePanel] = useState<'projects' | 'controls' | null>(null);

    // Autosave state for UI indicator
    const isSaving = useAutosaveStore((s) => s.isSaving);
    const autosaveError = useAutosaveStore((s) => s.lastError);

    // Start autosave on mount, stop on unmount
    useEffect(() => {
        startAutosave(15000); // autosave every 15 seconds

        return () => {
            stopAutosave();
        };
    }, []);

    // Show error notification when autosave fails
    useEffect(() => {
        if (autosaveError) {
            // Brief non-blocking notification - error is also available in useAutosaveStore
            console.warn(`Autosave failed: ${autosaveError}`);
        }
    }, [autosaveError]);

    // Warn user before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const hasChanges = getHasUnsavedChanges();
            console.debug("[App] beforeunload triggered, hasUnsavedChanges:", hasChanges);

            if (hasChanges) {
                // Standard way to trigger the browser's "unsaved changes" dialog
                e.preventDefault();
                // Legacy support for older browsers
                e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    const handleSave = useCallback(async () => {
        if (!projectId || isSavingManual) return;

        setIsSavingManual(true);
        try {
            const existing = await getProject(projectId);
            await upsertProject({
                id: projectId,
                name: projectName,
                type: projectType,
                createdAt: existing?.createdAt ?? Date.now(),
                updatedAt: Date.now(),
                editorState: serialize(),
                thumbnail: existing?.thumbnail,
            });

            markClean(); // No more unsaved changes after successful save
            showSuccess("Project saved!");
        } catch (error) {
            console.error("Failed to save project:", error);
            showError("Failed to save project. Please try again.");
        } finally {
            setIsSavingManual(false);
        }
    }, [projectId, projectName, projectType, serialize, isSavingManual]);

    return (
        <div className="appRoot">
            <header className="topBar">
                <div className="brand">
                    <div className="logoDot" />
                    <div>
                        <div className="brandTitle">Textile Pattern Studio</div>
                        <div className="brandSubtitle">
                            {projectId ? `Editing: ${projectName}` : "Local-first • Offline • No login"}
                        </div>
                    </div>
                </div>

                <div className="topActions">
                    {/* Autosave indicator */}
                    {isSaving && (
                        <div className="autosaveIndicator">
                            <div className="autosaveSpinner" />
                            <span>Saving...</span>
                        </div>
                    )}
                    {autosaveError && !isSaving && (
                        <div className="autosaveError" title={autosaveError}>
                            Save failed
                        </div>
                    )}
                    {projectId && (
                        <button
                            className={`btn btnPrimary ${isSavingManual ? "btn--loading" : ""}`}
                            onClick={handleSave}
                            disabled={isSavingManual}
                        >
                            {isSavingManual ? "Saving..." : "Save"}
                        </button>
                    )}
                    <button className="btn btnGhost" onClick={() => setExportOpen(true)}>
                        Export
                    </button>

                    {/* Mobile menu button */}
                    <button
                        className="mobileMenuBtn"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                    >
                        ☰
                    </button>
                </div>

                {/* Mobile dropdown menu */}
                {showMobileMenu && (
                    <div className="mobileMenu">
                        <button onClick={() => { setMobilePanel('projects'); setShowMobileMenu(false); }}>
                            Projects
                        </button>
                        <button onClick={() => { setMobilePanel('controls'); setShowMobileMenu(false); }}>
                            Controls
                        </button>
                        <button onClick={() => { setMobilePanel(null); setShowMobileMenu(false); }}>
                            Canvas
                        </button>
                    </div>
                )}
            </header>

            <div className="layout">
                {/* Left panel */}
                <aside className="panel leftPanel">
                    <div className="panelHeader">Projects</div>
                    <div className="panelBody">
                        <ProjectList />
                    </div>
                </aside>

                {/* Center canvas */}
                <main className="center">
                    {cadProject ? (
                        /* CAD Modules (Weave, Knit, Jacquard, Tuft) */
                        <ModuleRouter project={cadProject} />
                    ) : (
                        /* Print / Surface editor */
                        <div className="canvasShell">
                            <div className="canvasHeader">
                                <div className="canvasTitle">Repeat Preview</div>
                                <div className="canvasMeta">
                                    {projectId
                                        ? "Click artwork to select • Drag to move • 'Pick Source Color' to map colors"
                                        : "Open a project to begin"}
                                </div>
                            </div>

                            <div className="canvasPlaceholder" style={{ padding: 0 }}>
                                <TilePreviewCanvas />
                            </div>
                        </div>
                    )}
                </main>

                {/* Right panel */}
                <aside className="panel rightPanel">
                    <div className="panelHeader">Layers & Repeat</div>
                    <div className="panelBody">
                        <LayerPanel />

                        <div className="divider" />
                        <RepeatPanel />

                        <div className="divider" />
                        <PalettePanel />

                        <div className="divider" />
                        <RecolorPanel />

                        <div className="divider" />
                        <ProductionPanel />

                        <div className="divider" />
                        <CleaningPanel />

                        <div className="divider" />
                        <CollectionPanel />
                    </div>
                </aside>
            </div>

            <footer className="footer">
                <span>v0.9 • Prompt 8</span>
                <span className="dotSep">•</span>
                <span>Collections & Merchandising</span>
            </footer>

            <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
            <ProcessingIndicator />
            <ToastContainer />

            {/* Mobile panel overlay */}
            {mobilePanel && (
                <div className="mobileOverlay">
                    <button className="mobileCloseBtn" onClick={() => setMobilePanel(null)}>✕</button>
                    {mobilePanel === 'projects' && (
                        <div className="mobileOverlayContent">
                            <h3 className="mobileOverlayTitle">Projects</h3>
                            <ProjectList />
                        </div>
                    )}
                    {mobilePanel === 'controls' && (
                        <div className="mobileOverlayContent">
                            <h3 className="mobileOverlayTitle">Controls</h3>
                            <LayerPanel />
                            <div className="divider" />
                            <RepeatPanel />
                            <div className="divider" />
                            <PalettePanel />
                            <div className="divider" />
                            <RecolorPanel />
                            <div className="divider" />
                            <ProductionPanel />
                            <div className="divider" />
                            <CleaningPanel />
                            <div className="divider" />
                            <CollectionPanel />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
