import { nanoid } from "nanoid";
import { useEffect, useMemo, useState } from "react";
import type { Collection, CollectionItem } from "../types/collection";
import { listProjects } from "../core/storage/projectRepo";
import type { ProjectRow } from "../types/project";
import { showError, showSuccess } from "./Toast";

import {
    addCollectionItem,
    createCollection,
    deleteCollection,
    deleteCollectionItem,
    listCollectionItems,
    listCollections,
    updateCollection,
    updateCollectionItem,
} from "../core/storage/collectionRepo";

export default function CollectionPanel() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [activeCollectionId, setActiveCollectionId] = useState<string>("");

    const [items, setItems] = useState<CollectionItem[]>([]);
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [busy, setBusy] = useState(false);

    const [loadError, setLoadError] = useState<string | null>(null);

    async function refresh() {
        setLoadError(null);
        try {
            const cs = await listCollections();
            setCollections(cs);

            const ps = await listProjects();
            setProjects(ps);

            if (!activeCollectionId && cs.length > 0) setActiveCollectionId(cs[0].id);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load collections";
            console.error("[CollectionPanel] Refresh failed:", err);
            setLoadError(message);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        async function loadItems() {
            if (!activeCollectionId) {
                setItems([]);
                return;
            }
            try {
                const rows = await listCollectionItems(activeCollectionId);
                setItems(rows);
            } catch (err) {
                console.error("[CollectionPanel] Failed to load items:", err);
                showError("Failed to load collection items");
            }
        }
        loadItems();
    }, [activeCollectionId]);

    const activeCollection = useMemo(
        () => collections.find((c) => c.id === activeCollectionId) ?? null,
        [collections, activeCollectionId]
    );

    async function handleCreateCollection() {
        const name = window.prompt("Collection name?", "New Collection");
        if (!name) return;

        try {
            const now = Date.now();
            const c: Collection = {
                id: nanoid(),
                name,
                createdAt: now,
                updatedAt: now,
            };

            await createCollection(c);
            await refresh();
            setActiveCollectionId(c.id);
        } catch (err) {
            console.error("[CollectionPanel] Failed to create collection:", err);
            showError("Failed to create collection");
        }
    }

    async function handleDeleteCollection() {
        if (!activeCollectionId) return;
        const ok = window.confirm("Delete this collection? Items will be removed.");
        if (!ok) return;

        try {
            await deleteCollection(activeCollectionId);
            setActiveCollectionId("");
            await refresh();
        } catch (err) {
            console.error("[CollectionPanel] Failed to delete collection:", err);
            showError("Failed to delete collection");
        }
    }

    async function handleAddItem(projectId: string) {
        if (!activeCollectionId) return;

        try {
            const now = Date.now();
            const maxOrder = items.reduce((m, it) => Math.max(m, it.order), -1);

            const item: CollectionItem = {
                id: nanoid(),
                collectionId: activeCollectionId,
                projectId,
                order: maxOrder + 1,
                createdAt: now,
                updatedAt: now,
                note: "",
                buyerName: "",
                fabricQuality: "",
                colorwayId: null,
            };

            await addCollectionItem(item);
            const rows = await listCollectionItems(activeCollectionId);
            setItems(rows);

            await updateCollection(activeCollectionId, { updatedAt: Date.now() });
            await refresh();
        } catch (err) {
            console.error("[CollectionPanel] Failed to add item:", err);
            showError("Failed to add item to collection");
        }
    }

    return (
        <div>
            <div className="hintCard" style={{ marginBottom: 12 }}>
                <div className="hintTitle">Collections</div>
                <div className="hintText">
                    Build buyer-ready collections and export line sheets (PDF) from selected designs.
                </div>
            </div>

            {loadError && (
                <div className="hintCard" style={{ marginBottom: 12, borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
                    <div className="hintTitle" style={{ color: "#ef4444" }}>Failed to load</div>
                    <div className="hintText" style={{ marginBottom: 8 }}>{loadError}</div>
                    <button className="btn" onClick={refresh}>Retry</button>
                </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button className="btn" onClick={handleCreateCollection}>
                    + Collection
                </button>
                <button className="btn btnGhost" disabled={!activeCollectionId} onClick={handleDeleteCollection}>
                    Delete
                </button>
                <button className="btn btnGhost" onClick={refresh}>
                    Refresh
                </button>
            </div>

            <button
                className={`btn btnGhost ${busy ? "btn--loading" : ""}`}
                style={{ width: "100%", marginBottom: 12 }}
                disabled={!activeCollectionId || items.length === 0 || busy}
                onClick={async () => {
                    if (!activeCollection) return;
                    setBusy(true);
                    try {
                        const { exportCollectionLineSheetZip } = await import("../core/export/exportLineSheetCollection");
                        await exportCollectionLineSheetZip({
                            collection: activeCollection,
                            items,
                            projects,
                            columns: 2,
                        });
                        showSuccess("Line sheet exported successfully!");
                    } catch (err) {
                        const message = err instanceof Error ? err.message : "Unknown error";
                        console.error("[CollectionPanel] Export failed:", err);
                        showError(`Failed to export line sheet: ${message}`);
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                {busy ? "Exporting..." : "Export Line Sheet PDF"}
            </button>

            <div className="formGroup">
                <label className="label">Active Collection</label>
                <select
                    className="select"
                    value={activeCollectionId}
                    onChange={(e) => setActiveCollectionId(e.target.value)}
                >
                    <option value="">— None —</option>
                    {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {activeCollection && (
                <>
                    <div className="formGroup">
                        <label className="label">Rename</label>
                        <input
                            className="input"
                            value={activeCollection.name}
                            onChange={async (e) => {
                                const v = e.target.value;
                                setCollections((prev) => prev.map((x) => (x.id === activeCollection.id ? { ...x, name: v } : x)));
                                try {
                                    await updateCollection(activeCollection.id, { name: v });
                                } catch (err) {
                                    console.error("[CollectionPanel] Failed to rename collection:", err);
                                }
                            }}
                        />
                    </div>

                    <div className="divider" />

                    <div className="formGroup">
                        <label className="label">Add Design (Project)</label>
                        <select
                            className="select"
                            disabled={!activeCollectionId}
                            onChange={async (e) => {
                                const pid = e.target.value;
                                if (!pid) return;
                                await handleAddItem(pid);
                                e.currentTarget.value = "";
                            }}
                            defaultValue=""
                        >
                            <option value="">Select project…</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="divider" />
                    <div className="hintCard" style={{ marginBottom: 10 }}>
                        <div className="hintTitle">Collection Items</div>
                        <div className="hintText">Reordering will be added in v2 (Prompt 8.1).</div>
                    </div>

                    {items.length === 0 ? (
                        <div className="hintCard">
                            <div className="hintTitle">No items</div>
                            <div className="hintText">Add projects to build a line sheet.</div>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                            {items.map((it) => {
                                const proj = projects.find((p) => p.id === it.projectId);
                                return (
                                    <div key={it.id} className="projectItem">
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div className="projectName">{proj?.name ?? "Unknown project"}</div>
                                                <div className="projectMeta">Order: {it.order}</div>
                                            </div>

                                            <button
                                                className="btn btnGhost"
                                                onClick={async () => {
                                                    const ok = window.confirm("Remove this item from collection?");
                                                    if (!ok) return;
                                                    try {
                                                        await deleteCollectionItem(it.id);
                                                        const rows = await listCollectionItems(activeCollectionId);
                                                        setItems(rows);
                                                    } catch (err) {
                                                        console.error("[CollectionPanel] Failed to remove item:", err);
                                                        showError("Failed to remove item");
                                                    }
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="formGroup" style={{ marginTop: 10 }}>
                                            <label className="label">Note</label>
                                            <input
                                                className="input"
                                                value={it.note ?? ""}
                                                onChange={async (e) => {
                                                    const v = e.target.value;
                                                    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, note: v } : x)));
                                                    try {
                                                        await updateCollectionItem(it.id, { note: v });
                                                    } catch (err) {
                                                        console.error("[CollectionPanel] Failed to update note:", err);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
