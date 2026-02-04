import { create } from "zustand";
import type { ProjectEditorState, Layer, ImageLayer, Palette, PaletteColor } from "../types/project";
import type { ProjectType } from "../types/projectType";
import type { Colorway } from "../types/colorway";
import type { ReductionResult } from "../types/production";
import { nanoid } from "nanoid";
import { markDirty, markClean } from "../core/storage/unsavedChanges";

export type RepeatMode = "straight" | "half-drop" | "mirror";

// Re-export types for backward compatibility
export type { Layer, ImageLayer, Palette, PaletteColor };

export type EditorState = {
    projectId: string | null;
    projectName: string;
    projectType: ProjectType;

    layers: Layer[];
    selectedLayerId: string | null;

    repeatMode: RepeatMode;
    tileWidth: number;
    tileHeight: number;
    seamPreview: boolean;

    // View state (zoom/pan)
    viewX: number;
    viewY: number;
    viewScale: number;

    // Tools
    activeTool: "select" | "pick-color";

    // Palettes
    palettes: Palette[];
    activePaletteId: string | null;

    // Colorways
    colorways: Colorway[];
    activeColorwayId: string | null;

    // Recolor State (current working state)
    colorMap: Record<string, string>; // SourceHex -> PaletteHex
    sourceColors: string[]; // List of detected/picked source colors

    // project
    hydrateFromProject: (project: { id: string; name: string; type?: ProjectType; editorState: ProjectEditorState }) => void;

    // repeat controls
    setRepeatMode: (m: RepeatMode) => void;
    setTileSize: (w: number, h: number) => void;
    setSeamPreview: (v: boolean) => void;

    // view controls
    setView: (patch: Partial<{ viewX: number; viewY: number; viewScale: number }>) => void;
    resetView: () => void;

    setActiveTool: (acc: "select" | "pick-color") => void;

    // recolor actions
    setColorMap: (map: Record<string, string>) => void;
    addSourceColor: (hex: string) => void;
    removeSourceColor: (hex: string) => void;
    createColorway: (name: string) => void;
    applyColorway: (id: string) => void;
    deleteColorway: (id: string) => void;
    shuffleColors: () => void;

    // layers
    addImageLayer: (payload: {
        name?: string;
        src: string;
        thumbnailSrc?: string;
        x?: number;
        y?: number;
        scale?: number;
        imgW?: number;
        imgH?: number;
        reductionMeta?: ReductionResult;
    }) => void;
    setSelectedLayer: (id: string | null) => void;
    updateLayer: (id: string, patch: Partial<Layer>) => void;
    removeLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;

    // palette functions
    createPalette: (name: string) => void;
    deletePalette: (id: string) => void;
    setActivePalette: (id: string | null) => void;
    addPaletteColor: (paletteId: string, hex: string, name?: string) => void;
    removePaletteColor: (paletteId: string, colorId: string) => void;

    reset: () => void;
    serialize: () => ProjectEditorState;
};

// Helper to safely cast persisted layers to Layer[]
function parsePersistedLayers(layers: unknown): Layer[] {
    if (!Array.isArray(layers)) return [];
    return layers as Layer[];
}

// Helper to safely cast persisted palettes to Palette[]
function parsePersistedPalettes(palettes: unknown): Palette[] {
    if (!Array.isArray(palettes)) return [];
    return palettes as Palette[];
}

// Helper to safely cast persisted colorways to Colorway[]
function parsePersistedColorways(colorways: unknown): Colorway[] {
    if (!Array.isArray(colorways)) return [];
    return colorways as Colorway[];
}

export const useEditorStore = create<EditorState>((set, get) => ({
    projectId: null,
    projectName: "Untitled",
    projectType: "print",

    layers: [],
    selectedLayerId: null,

    repeatMode: "straight",
    tileWidth: 1200,
    tileHeight: 1200,
    seamPreview: true,

    viewX: 0,
    viewY: 0,
    viewScale: 1,

    palettes: [],
    activePaletteId: null,
    colorways: [],
    activeColorwayId: null,

    activeTool: "select",
    colorMap: {},
    sourceColors: [],

    hydrateFromProject: (project) => {
        const es = project.editorState;
        set({
            projectId: project.id,
            projectName: project.name,
            projectType: project.type ?? "print",
            layers: parsePersistedLayers(es.layers),
            selectedLayerId: null,

            repeatMode: es.repeatMode ?? "straight",
            tileWidth: es.tileWidth ?? 1200,
            tileHeight: es.tileHeight ?? 1200,
            seamPreview: es.seamPreview ?? true,

            viewX: es.viewX ?? 0,
            viewY: es.viewY ?? 0,
            viewScale: es.viewScale ?? 1,

            palettes: parsePersistedPalettes(es.palettes),
            activePaletteId: es.activePaletteId ?? null,
            colorways: parsePersistedColorways(es.colorways),
            activeColorwayId: es.activeColorwayId ?? null,

            activeTool: es.activeTool ?? "select",
            colorMap: es.colorMap ?? {},
            sourceColors: es.sourceColors ?? [],
        });
        // Just loaded from saved state - no unsaved changes
        markClean();
    },

    setRepeatMode: (m) => set({ repeatMode: m }),
    setTileSize: (w, h) => set({ tileWidth: w, tileHeight: h }),
    setSeamPreview: (v) => set({ seamPreview: v }),

    setView: (patch) => set((s) => ({ ...s, ...patch })),
    resetView: () => set({ viewX: 0, viewY: 0, viewScale: 1 }),

    setActiveTool: (t) => set({ activeTool: t }),

    setColorMap: (map) => set({ colorMap: map }),

    addSourceColor: (hex) => set((s) => {
        if (s.sourceColors.includes(hex)) return s;
        return { sourceColors: [...s.sourceColors, hex] };
    }),

    removeSourceColor: (hex) => set((s) => ({
        sourceColors: s.sourceColors.filter(c => c !== hex),
        // also remove from map
        colorMap: Object.fromEntries(Object.entries(s.colorMap).filter(([k]) => k !== hex))
    })),

    createColorway: (name) => {
        const id = nanoid();
        const s = get();
        const newColorway: Colorway = {
            id,
            name,
            paletteId: s.activePaletteId ?? "",
            createdAt: Date.now(),
            colorMap: { ...s.colorMap }
        };
        set(state => ({
            colorways: [...state.colorways, newColorway],
            activeColorwayId: id
        }));
    },

    applyColorway: (id) => {
        const s = get();
        const cw = s.colorways.find(c => c.id === id);
        if (cw) {
            set({
                activeColorwayId: id,
                colorMap: { ...cw.colorMap }
            });
        }
    },

    deleteColorway: (id) => set(s => ({
        colorways: s.colorways.filter(c => c.id !== id),
        activeColorwayId: s.activeColorwayId === id ? null : s.activeColorwayId
    })),

    shuffleColors: () => {
        const s = get();
        if (!s.activePaletteId) return;
        const pal = s.palettes.find(p => p.id === s.activePaletteId);
        if (!pal || pal.colors.length === 0) return;

        // Simple shuffle: assign random palette color to each source color
        const newMap: Record<string, string> = {};
        s.sourceColors.forEach(sourceHex => {
            const randomIdx = Math.floor(Math.random() * pal.colors.length);
            newMap[sourceHex] = pal.colors[randomIdx].hex;
        });

        set({ colorMap: newMap, activeColorwayId: null }); // modified, so detach from saved colorway
    },

    addImageLayer: ({ name, src, thumbnailSrc, x, y, scale, imgW, imgH, reductionMeta }) => {
        const id = nanoid();
        const s = get();
        const newLayer: ImageLayer = {
            id,
            type: "image",
            name: name ?? "Artwork",
            src,
            thumbnailSrc,
            imgW,
            imgH,
            x: x ?? s.tileWidth / 4,
            y: y ?? s.tileHeight / 4,
            scale: scale ?? 1,
            rotation: 0,
            visible: true,
            reductionMeta,
        };

        set((s) => ({
            layers: [...s.layers, newLayer],
            selectedLayerId: id,
        }));
    },

    setSelectedLayer: (id) => set({ selectedLayerId: id }),

    updateLayer: (id, patch) =>
        set((s) => ({
            layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),

    removeLayer: (id) =>
        set((s) => ({
            layers: s.layers.filter((l) => l.id !== id),
            selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
        })),

    toggleLayerVisibility: (id) =>
        set((s) => ({
            layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
        })),

    // Palette functions
    createPalette: (name: string) => {
        const now = Date.now();
        const id = nanoid();

        const palette: Palette = {
            id,
            name,
            colors: [],
            createdAt: now,
            updatedAt: now,
        };

        set((s) => ({
            palettes: [...s.palettes, palette],
            activePaletteId: id,
        }));
    },

    deletePalette: (id: string) =>
        set((s) => {
            const palettes = s.palettes.filter((p) => p.id !== id);
            const nextActive = s.activePaletteId === id ? null : s.activePaletteId;
            return { palettes, activePaletteId: nextActive };
        }),

    setActivePalette: (id: string | null) => set({ activePaletteId: id }),

    addPaletteColor: (paletteId: string, hex: string, name?: string) =>
        set((s) => {
            const palettes = s.palettes.map((p) => {
                if (p.id !== paletteId) return p;
                return {
                    ...p,
                    updatedAt: Date.now(),
                    colors: [
                        ...p.colors,
                        {
                            id: nanoid(),
                            hex,
                            name: name ?? hex,
                        },
                    ],
                };
            });
            return { palettes };
        }),

    removePaletteColor: (paletteId: string, colorId: string) =>
        set((s) => {
            const palettes = s.palettes.map((p) => {
                if (p.id !== paletteId) return p;
                return {
                    ...p,
                    updatedAt: Date.now(),
                    colors: p.colors.filter((c) => c.id !== colorId),
                };
            });
            return { palettes };
        }),

    reset: () => {
        set({
            projectId: null,
            projectName: "Untitled",
            projectType: "print",
            layers: [],
            selectedLayerId: null,
            repeatMode: "straight",
            tileWidth: 1200,
            tileHeight: 1200,
            seamPreview: true,
            viewX: 0,
            viewY: 0,
            viewScale: 1,
            palettes: [],
            activePaletteId: null,
            colorways: [],
            activeColorwayId: null,
        });
        // Reset means no project open - no unsaved changes
        markClean();
    },

    serialize: (): ProjectEditorState => {
        const s = get();
        return {
            layers: s.layers,
            repeatMode: s.repeatMode,
            tileWidth: s.tileWidth,
            tileHeight: s.tileHeight,
            seamPreview: s.seamPreview,
            viewX: s.viewX,
            viewY: s.viewY,
            viewScale: s.viewScale,
            palettes: s.palettes,
            activePaletteId: s.activePaletteId,
            colorways: s.colorways,
            activeColorwayId: s.activeColorwayId,
            activeTool: s.activeTool,
            colorMap: s.colorMap,
            sourceColors: s.sourceColors,
        };
    },
}));

// ============================================================================
// Dirty Tracking Subscription
// ============================================================================
// Subscribe to state changes and mark as dirty when user makes edits.
// We track specific fields that represent user data (not UI state like selection).

let isInitialized = false;

useEditorStore.subscribe((state, prevState) => {
    // Skip the first call (initialization)
    if (!isInitialized) {
        isInitialized = true;
        console.debug("[EditorStore] Subscription initialized");
        return;
    }

    // Skip if no project is open
    if (!state.projectId) {
        return;
    }

    // Check if any persistable data changed (not just selection/view)
    const dataChanged =
        state.layers !== prevState.layers ||
        state.repeatMode !== prevState.repeatMode ||
        state.tileWidth !== prevState.tileWidth ||
        state.tileHeight !== prevState.tileHeight ||
        state.seamPreview !== prevState.seamPreview ||
        state.palettes !== prevState.palettes ||
        state.colorways !== prevState.colorways ||
        state.colorMap !== prevState.colorMap ||
        state.sourceColors !== prevState.sourceColors ||
        state.projectName !== prevState.projectName;

    if (dataChanged) {
        console.debug("[EditorStore] Data changed, marking dirty");
        markDirty();
    }
});
