import { db } from "./db";
import type { ProjectRow } from "../../types/project";

export async function upsertProject(project: ProjectRow) {
    await db.projects.put(project);
}

export async function getProject(projectId: string) {
    return db.projects.get(projectId);
}

export async function listProjects() {
    return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function deleteProject(projectId: string) {
    await db.projects.delete(projectId);
}
