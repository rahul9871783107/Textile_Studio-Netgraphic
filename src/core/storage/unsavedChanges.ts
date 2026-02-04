// ============================================================================
// Unsaved Changes Tracking
// ============================================================================
// Simple module to track whether there are unsaved changes in the editor.
// Used by the beforeunload handler to warn users before leaving.

let hasUnsavedChanges = false;

/**
 * Sets whether there are unsaved changes.
 * Call with `true` when the editor state changes.
 * Call with `false` after a successful save.
 */
export function setHasUnsavedChanges(value: boolean): void {
    hasUnsavedChanges = value;
}

/**
 * Returns whether there are unsaved changes.
 */
export function getHasUnsavedChanges(): boolean {
    return hasUnsavedChanges;
}

/**
 * Marks the editor as having unsaved changes.
 * Convenience function for common use case.
 */
export function markDirty(): void {
    hasUnsavedChanges = true;
    console.debug("[UnsavedChanges] Marked dirty");
}

/**
 * Marks the editor as having no unsaved changes.
 * Convenience function for common use case.
 */
export function markClean(): void {
    hasUnsavedChanges = false;
    console.debug("[UnsavedChanges] Marked clean");
}
