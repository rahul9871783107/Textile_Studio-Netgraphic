import { upsertProject, getProject } from "./projectRepo";
import { useEditorStore } from "../../store/useEditorStore";
import { create } from "zustand";
import { markClean } from "./unsavedChanges";

// ============================================================================
// Autosave State Store
// ============================================================================
// Provides reactive state that components can subscribe to for UI indicators

interface AutosaveState {
    isSaving: boolean;
    lastSaveTime: number | null;
    lastError: string | null;
    _setIsSaving: (saving: boolean) => void;
    _setLastSaveTime: (time: number) => void;
    _setLastError: (error: string | null) => void;
}

export const useAutosaveStore = create<AutosaveState>((set) => ({
    isSaving: false,
    lastSaveTime: null,
    lastError: null,
    _setIsSaving: (saving) => set({ isSaving: saving }),
    _setLastSaveTime: (time) => set({ lastSaveTime: time, lastError: null }),
    _setLastError: (error) => set({ lastError: error }),
}));

// ============================================================================
// Autosave Timer & Lock
// ============================================================================

let timer: number | null = null;
let isSaveInProgress = false;
let currentIntervalMs = 15000;

/**
 * Performs a single autosave operation.
 * Protected by a lock to prevent concurrent saves.
 */
async function performAutosave(): Promise<void> {
    // Don't start a new save if one is already running (race condition prevention)
    if (isSaveInProgress) {
        console.debug("[Autosave] Skipped: save already in progress");
        return;
    }

    const state = useEditorStore.getState();

    // Nothing to save if no project is open
    if (!state.projectId) {
        return;
    }

    const { _setIsSaving, _setLastSaveTime, _setLastError } = useAutosaveStore.getState();

    isSaveInProgress = true;
    _setIsSaving(true);

    try {
        const existing = await getProject(state.projectId);

        await upsertProject({
            id: state.projectId,
            name: state.projectName,
            type: state.projectType,
            createdAt: existing?.createdAt ?? Date.now(),
            updatedAt: Date.now(),
            editorState: state.serialize(),
            thumbnail: existing?.thumbnail,
        });

        _setLastSaveTime(Date.now());
        markClean(); // No more unsaved changes after successful save
        console.debug("[Autosave] Saved successfully");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error during autosave";
        console.error("[Autosave] Failed:", message);
        _setLastError(message);

        // Show user-visible notification for autosave failures
        // Using a non-blocking approach - components can subscribe to lastError
        // But also dispatch a custom event for any listeners
        window.dispatchEvent(new CustomEvent("autosave-error", {
            detail: { message }
        }));
    } finally {
        isSaveInProgress = false;
        _setIsSaving(false);
    }
}

/**
 * Starts the autosave timer.
 * If already running, this is a no-op (call stopAutosave first to change interval).
 *
 * @param intervalMs - Interval between saves in milliseconds (default: 15000)
 */
export function startAutosave(intervalMs = 15000): void {
    if (timer !== null) {
        console.debug("[Autosave] Already running");
        return;
    }

    currentIntervalMs = intervalMs;
    timer = window.setInterval(performAutosave, intervalMs);
    console.debug(`[Autosave] Started with ${intervalMs}ms interval`);
}

/**
 * Stops the autosave timer and cleans up.
 * Safe to call multiple times.
 */
export function stopAutosave(): void {
    if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
        console.debug("[Autosave] Stopped");
    }

    // Reset state
    const { _setIsSaving, _setLastError } = useAutosaveStore.getState();
    _setIsSaving(false);
    _setLastError(null);
}

/**
 * Restarts autosave with a new interval.
 *
 * @param intervalMs - New interval in milliseconds
 */
export function restartAutosave(intervalMs: number): void {
    stopAutosave();
    startAutosave(intervalMs);
}

/**
 * Triggers an immediate save (outside the timer).
 * Respects the lock - won't run if another save is in progress.
 *
 * @returns Promise that resolves when save completes (or immediately if skipped)
 */
export async function saveNow(): Promise<void> {
    await performAutosave();
}

/**
 * Gets the current autosave configuration.
 */
export function getAutosaveConfig(): { isRunning: boolean; intervalMs: number } {
    return {
        isRunning: timer !== null,
        intervalMs: currentIntervalMs,
    };
}

/**
 * Cleanup function for use in useEffect return.
 * Stops autosave and clears all state.
 */
export function cleanup(): void {
    stopAutosave();
    isSaveInProgress = false;
}
