/**
 * Module-level stage reference management.
 *
 * This replaces the insecure window.__TEXTILE_STAGE__ global exposure.
 * The stage reference is stored in module scope, which is not accessible
 * to external scripts.
 */

import type { Stage } from "konva/lib/Stage";

// ============================================================================
// Stage Reference Storage
// ============================================================================

let stageRef: Stage | null = null;
let viewMeta: ViewMeta | null = null;

export interface ViewMeta {
    tilePxRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    sheetPxRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Sets the stage reference. Called by TilePreviewCanvas when mounted.
 */
export function setStageRef(stage: Stage | null): void {
    stageRef = stage;
}

/**
 * Gets the current stage reference.
 * Returns null if not set.
 */
export function getStageRef(): Stage | null {
    return stageRef;
}

/**
 * Sets the view metadata (tile and sheet rectangles).
 * Called by TilePreviewCanvas when view changes.
 */
export function setViewMeta(meta: ViewMeta | null): void {
    viewMeta = meta;
}

/**
 * Gets the current view metadata.
 * Returns null if not set.
 */
export function getViewMeta(): ViewMeta | null {
    return viewMeta;
}

/**
 * Clears all references. Called when canvas unmounts.
 */
export function clearRefs(): void {
    stageRef = null;
    viewMeta = null;
}
