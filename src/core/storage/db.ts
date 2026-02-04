import Dexie, { type Table } from "dexie";
import type { ProjectRow } from "../../types/project";
import type { Collection, CollectionItem } from "../../types/collection";

// ============================================================================
// Image Blob Storage Type
// ============================================================================

export type ImageBlob = {
    id: string;           // Unique image ID (used as reference in layers)
    projectId: string;    // Associated project ID
    blob: Blob;           // Full-resolution image as Blob
    mimeType: string;     // Image MIME type (e.g., "image/png")
    width: number;        // Original width in pixels
    height: number;       // Original height in pixels
    createdAt: number;    // Timestamp
};

class TextileDB extends Dexie {
    projects!: Table<ProjectRow, string>;
    collections!: Table<Collection, string>;
    collectionItems!: Table<CollectionItem, string>;
    imageBlobs!: Table<ImageBlob, string>;

    constructor() {
        super("textileStudioDB");

        this.version(1).stores({
            projects: "id, updatedAt, createdAt",
        });

        // new schema version
        this.version(2).stores({
            projects: "id, updatedAt, createdAt",
            collections: "id, updatedAt, createdAt",
            collectionItems: "id, collectionId, projectId, order, updatedAt",
        });

        // Version 3: Add image blob storage for large images
        this.version(3).stores({
            projects: "id, updatedAt, createdAt",
            collections: "id, updatedAt, createdAt",
            collectionItems: "id, collectionId, projectId, order, updatedAt",
            imageBlobs: "id, projectId, createdAt",
        });
    }
}

export const db = new TextileDB();
