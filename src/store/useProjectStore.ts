import { create } from "zustand";
import type { ProjectRow } from "../types/project";
import { listProjects } from "../core/storage/projectRepo";

type ProjectStore = {
    projects: ProjectRow[];
    isLoading: boolean;
    error: string | null;

    refresh: () => Promise<void>;
    setProjects: (p: ProjectRow[]) => void;
    clearError: () => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
    projects: [],
    isLoading: false,
    error: null,

    setProjects: (p) => set({ projects: p }),

    clearError: () => set({ error: null }),

    refresh: async () => {
        set({ isLoading: true, error: null });
        try {
            const projects = await listProjects();
            set({ projects, isLoading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load projects";
            console.error("[ProjectStore] Failed to load projects:", message);
            set({ error: message, isLoading: false });
        }
    },
}));
