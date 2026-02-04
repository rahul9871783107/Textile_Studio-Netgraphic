import type { ProjectRow, ProjectEditorState, Layer } from "../../types/project";
import type { ProjectType } from "../../types/projectType";
import { nanoid } from "nanoid";

// ============================================================================
// Constants for validation
// ============================================================================

const VALID_PROJECT_TYPES: ProjectType[] = ["print", "weave", "knit", "jacquard", "tuft"];
const VALID_REPEAT_MODES = ["straight", "half-drop", "mirror"] as const;
const MAX_STRING_LENGTH = 500;
const MAX_NAME_LENGTH = 200;
const MAX_LAYERS = 100;
const MAX_DATA_URL_LENGTH = 50 * 1024 * 1024; // 50MB limit for data URLs

// ============================================================================
// Validation Helpers
// ============================================================================

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isNumber(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Sanitize a string by trimming and limiting length.
 */
function sanitizeString(value: string, maxLength = MAX_STRING_LENGTH): string {
    return value.trim().slice(0, maxLength);
}

/**
 * Sanitize a name field with stricter limits.
 */
function sanitizeName(value: string): string {
    // Remove control characters and limit length
    return value
        .replace(/[\x00-\x1f\x7f]/g, "")
        .trim()
        .slice(0, MAX_NAME_LENGTH);
}

/**
 * Validate a data URL (for images).
 * Returns true if valid, false otherwise.
 */
function isValidDataUrl(value: string): boolean {
    if (!value.startsWith("data:")) return false;
    if (value.length > MAX_DATA_URL_LENGTH) return false;
    // Basic format check
    return /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(value);
}

// ============================================================================
// Layer Validation
// ============================================================================

function validateLayer(layer: unknown, index: number): Layer | null {
    if (!isObject(layer)) {
        console.warn(`[ProjectBackup] Layer ${index} is not an object`);
        return null;
    }

    const { id, type, name, src, x, y, scale, rotation, visible } = layer;

    // Required fields
    if (!isString(id) || !id) {
        console.warn(`[ProjectBackup] Layer ${index} missing id`);
        return null;
    }
    if (type !== "image") {
        console.warn(`[ProjectBackup] Layer ${index} has invalid type`);
        return null;
    }
    if (!isString(name)) {
        console.warn(`[ProjectBackup] Layer ${index} missing name`);
        return null;
    }
    if (!isString(src)) {
        console.warn(`[ProjectBackup] Layer ${index} missing src`);
        return null;
    }
    // Validate src is a data URL (not an external URL for security)
    if (!isValidDataUrl(src)) {
        console.warn(`[ProjectBackup] Layer ${index} has invalid src (must be data URL)`);
        return null;
    }
    if (!isNumber(x) || !isNumber(y)) {
        console.warn(`[ProjectBackup] Layer ${index} missing x/y coordinates`);
        return null;
    }
    if (!isNumber(scale) || scale <= 0) {
        console.warn(`[ProjectBackup] Layer ${index} has invalid scale`);
        return null;
    }
    if (!isNumber(rotation)) {
        console.warn(`[ProjectBackup] Layer ${index} missing rotation`);
        return null;
    }
    if (!isBoolean(visible)) {
        console.warn(`[ProjectBackup] Layer ${index} missing visible flag`);
        return null;
    }

    // Optional fields
    const imgW = isNumber(layer.imgW) ? layer.imgW : undefined;
    const imgH = isNumber(layer.imgH) ? layer.imgH : undefined;
    const reductionMeta = isObject(layer.reductionMeta) ? layer.reductionMeta : undefined;

    return {
        id: sanitizeString(id),
        type: "image",
        name: sanitizeName(name),
        src, // Already validated as data URL
        imgW,
        imgH,
        x,
        y,
        scale,
        rotation,
        visible,
        reductionMeta: reductionMeta as Layer["reductionMeta"],
    };
}

// ============================================================================
// Editor State Validation
// ============================================================================

function validateEditorState(state: unknown): ProjectEditorState | null {
    if (!isObject(state)) {
        return null;
    }

    // Required fields
    const { layers, repeatMode, tileWidth, tileHeight } = state;

    if (!isArray(layers)) {
        console.warn("[ProjectBackup] editorState.layers is not an array");
        return null;
    }
    if (layers.length > MAX_LAYERS) {
        console.warn(`[ProjectBackup] Too many layers (max ${MAX_LAYERS})`);
        return null;
    }

    // Validate each layer
    const validatedLayers: Layer[] = [];
    for (let i = 0; i < layers.length; i++) {
        const validLayer = validateLayer(layers[i], i);
        if (validLayer) {
            validatedLayers.push(validLayer);
        }
        // Skip invalid layers instead of failing entire import
    }

    if (!VALID_REPEAT_MODES.includes(repeatMode as typeof VALID_REPEAT_MODES[number])) {
        console.warn("[ProjectBackup] Invalid repeatMode");
        return null;
    }

    if (!isNumber(tileWidth) || tileWidth <= 0 || tileWidth > 10000) {
        console.warn("[ProjectBackup] Invalid tileWidth");
        return null;
    }
    if (!isNumber(tileHeight) || tileHeight <= 0 || tileHeight > 10000) {
        console.warn("[ProjectBackup] Invalid tileHeight");
        return null;
    }

    // Optional fields with defaults
    const seamPreview = isBoolean(state.seamPreview) ? state.seamPreview : true;
    const viewX = isNumber(state.viewX) ? state.viewX : 0;
    const viewY = isNumber(state.viewY) ? state.viewY : 0;
    const viewScale = isNumber(state.viewScale) && state.viewScale > 0 ? state.viewScale : 1;
    const palettes = isArray(state.palettes) ? state.palettes : [];
    const activePaletteId = isString(state.activePaletteId) ? state.activePaletteId : null;
    const colorways = isArray(state.colorways) ? state.colorways : [];
    const activeColorwayId = isString(state.activeColorwayId) ? state.activeColorwayId : null;
    const activeTool = state.activeTool === "pick-color" ? "pick-color" : "select";
    const colorMap = isObject(state.colorMap) ? state.colorMap as Record<string, string> : {};
    const sourceColors = isArray(state.sourceColors) ? (state.sourceColors as string[]).filter(isString) : [];

    return {
        layers: validatedLayers,
        repeatMode: repeatMode as ProjectEditorState["repeatMode"],
        tileWidth,
        tileHeight,
        seamPreview,
        viewX,
        viewY,
        viewScale,
        palettes: palettes as ProjectEditorState["palettes"],
        activePaletteId,
        colorways: colorways as ProjectEditorState["colorways"],
        activeColorwayId,
        activeTool,
        colorMap,
        sourceColors,
    };
}

// ============================================================================
// Project Schema Validation
// ============================================================================

export class ProjectValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProjectValidationError";
    }
}

/**
 * Validates and sanitizes imported project data.
 * Returns a valid ProjectRow or throws ProjectValidationError.
 */
export function validateProjectSchema(data: unknown): ProjectRow {
    if (!isObject(data)) {
        throw new ProjectValidationError("Invalid project file: not a valid JSON object");
    }

    const { id, name, type, createdAt, updatedAt, editorState, thumbnail } = data;

    // Validate required fields
    if (!isString(id) || !id) {
        throw new ProjectValidationError("Invalid project file: missing or invalid 'id' field");
    }

    if (!isString(name) || !name.trim()) {
        throw new ProjectValidationError("Invalid project file: missing or invalid 'name' field");
    }

    if (!isString(type) || !VALID_PROJECT_TYPES.includes(type as ProjectType)) {
        throw new ProjectValidationError(
            `Invalid project file: 'type' must be one of: ${VALID_PROJECT_TYPES.join(", ")}`
        );
    }

    if (!isNumber(createdAt) || createdAt <= 0) {
        throw new ProjectValidationError("Invalid project file: missing or invalid 'createdAt' field");
    }

    if (!isNumber(updatedAt) || updatedAt <= 0) {
        throw new ProjectValidationError("Invalid project file: missing or invalid 'updatedAt' field");
    }

    // Validate editorState
    const validatedEditorState = validateEditorState(editorState);
    if (!validatedEditorState) {
        throw new ProjectValidationError("Invalid project file: 'editorState' is missing or malformed");
    }

    // Validate optional thumbnail
    let validatedThumbnail: string | undefined;
    if (thumbnail !== undefined) {
        if (!isString(thumbnail)) {
            throw new ProjectValidationError("Invalid project file: 'thumbnail' must be a string");
        }
        if (thumbnail && !isValidDataUrl(thumbnail)) {
            // Skip invalid thumbnails instead of failing
            console.warn("[ProjectBackup] Invalid thumbnail data URL, skipping");
            validatedThumbnail = undefined;
        } else {
            validatedThumbnail = thumbnail || undefined;
        }
    }

    return {
        id: sanitizeString(id),
        name: sanitizeName(name),
        type: type as ProjectType,
        createdAt,
        updatedAt,
        editorState: validatedEditorState,
        thumbnail: validatedThumbnail,
    };
}

// ============================================================================
// Export / Import Functions
// ============================================================================

export function exportProjectJson(project: ProjectRow) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name}-backup.json`;
    link.click();

    URL.revokeObjectURL(url);
}

export async function importProjectJson(file: File): Promise<ProjectRow> {
    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        throw new ProjectValidationError("File is too large (max 100MB)");
    }

    // Validate file type
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
        throw new ProjectValidationError("File must be a JSON file");
    }

    let parsed: unknown;
    try {
        const txt = await file.text();
        parsed = JSON.parse(txt);
    } catch (e) {
        throw new ProjectValidationError("File contains invalid JSON");
    }

    // Validate schema
    const validatedProject = validateProjectSchema(parsed);

    // Generate new ID and update timestamps for imported project
    const now = Date.now();
    return {
        ...validatedProject,
        id: nanoid(),
        name: `${validatedProject.name} (Imported)`,
        createdAt: now,
        updatedAt: now,
    };
}
