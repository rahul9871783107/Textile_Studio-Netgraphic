import { db } from "./db";
import type { Collection, CollectionItem } from "../../types/collection";

export async function createCollection(c: Collection) {
    await db.collections.put(c);
}

export async function deleteCollection(collectionId: string) {
    await db.collectionItems.where("collectionId").equals(collectionId).delete();
    await db.collections.delete(collectionId);
}

export async function listCollections() {
    return db.collections.orderBy("updatedAt").reverse().toArray();
}

export async function getCollection(collectionId: string) {
    return db.collections.get(collectionId);
}

export async function updateCollection(collectionId: string, patch: Partial<Collection>) {
    await db.collections.update(collectionId, { ...patch, updatedAt: Date.now() });
}

// items
export async function listCollectionItems(collectionId: string) {
    return db.collectionItems.where("collectionId").equals(collectionId).sortBy("order");
}

export async function addCollectionItem(item: CollectionItem) {
    await db.collectionItems.put(item);
}

export async function updateCollectionItem(itemId: string, patch: Partial<CollectionItem>) {
    await db.collectionItems.update(itemId, { ...patch, updatedAt: Date.now() });
}

export async function deleteCollectionItem(itemId: string) {
    await db.collectionItems.delete(itemId);
}
