import type { ProjectType } from "./projectType";
import type { Colorway } from "./colorway";
import type { ReductionResult } from "./production";

// ============================================================================
// Layer Types
// ============================================================================

export type ImageLayer = {
    id: string;
    type: "image";
    name: string;
    /**
     * Image source. Can be:
     * - Data URL for small images (<2MB)
     * - "blobref:<id>" for large images stored in IndexedDB
     */
    src: string;
    /**
     * Small thumbnail data URL for preview rendering (max 200px).
     * Used when src is a blob reference to avoid loading full image for display.
     */
    thumbnailSrc?: string;
    imgW?: number;
    imgH?: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    visible: boolean;
    reductionMeta?: ReductionResult;
};

export type Layer = ImageLayer;

// ============================================================================
// Palette Types
// ============================================================================

export type PaletteColor = {
    id: string;
    name: string;
    hex: string;
};

export type Palette = {
    id: string;
    name: string;
    colors: PaletteColor[];
    createdAt: number;
    updatedAt: number;
};

// ============================================================================
// Editor State (persisted)
// ============================================================================

export type ProjectEditorState = {
    layers: Layer[];
    repeatMode: "straight" | "half-drop" | "mirror";
    tileWidth: number;
    tileHeight: number;
    seamPreview?: boolean;

    viewX?: number;
    viewY?: number;
    viewScale?: number;

    palettes?: Palette[];
    activePaletteId?: string | null;
    colorways?: Colorway[];
    activeColorwayId?: string | null;

    activeTool?: "select" | "pick-color";
    colorMap?: Record<string, string>;
    sourceColors?: string[];

    // CAD module state (Prompt 11+)
    weaveModel?: unknown;      // WeaveModel for weave projects
    jacquardModel?: unknown;   // JacquardModel for jacquard projects
};

// ============================================================================
// Project Row (database record)
// ============================================================================

export type ProjectRow = {
    id: string;
    name: string;
    type: ProjectType; // print, weave, knit, jacquard, tuft
    createdAt: number;
    updatedAt: number;
    editorState: ProjectEditorState;
    thumbnail?: string;
};
