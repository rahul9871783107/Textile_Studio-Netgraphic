/**
 * Image Store Module
 *
 * Handles storage of large images in IndexedDB as Blobs for better performance.
 * Images over 2MB are stored as Blobs in IndexedDB instead of inline data URLs.
 * Small thumbnails (max 200px) are kept in state for preview rendering.
 */

import { db, type ImageBlob } from "./db";
import { nanoid } from "nanoid";

// ============================================================================
// Constants
// ============================================================================

/** Threshold in bytes above which images are stored in IndexedDB */
export const BLOB_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2MB

/** Maximum thumbnail dimension in pixels */
export const THUMBNAIL_MAX_SIZE = 200;

// ============================================================================
// Types
// ============================================================================

export type ImageStoreResult = {
    /** Unique ID for retrieving the full image from IndexedDB */
    blobId: string;
    /** Small thumbnail data URL for preview rendering */
    thumbnailDataUrl: string;
    /** Original image width */
    width: number;
    /** Original image height */
    height: number;
    /** Whether the image was stored in IndexedDB (large) or kept inline (small) */
    isStoredAsBlob: boolean;
};

export type StoredImageInfo = {
    blobId: string | null;
    thumbnailDataUrl: string;
    fullDataUrl: string | null;
    width: number;
    height: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a data URL to a Blob.
 */
function dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Converts a Blob to a data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read blob"));
        reader.readAsDataURL(blob);
    });
}

/**
 * Loads an image from a data URL or Blob URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
    });
}

/**
 * Creates a thumbnail from an image.
 * Returns a data URL of the thumbnail.
 */
async function createThumbnail(
    img: HTMLImageElement,
    maxSize: number = THUMBNAIL_MAX_SIZE
): Promise<string> {
    const { width, height } = img;

    // Calculate thumbnail dimensions maintaining aspect ratio
    let thumbW = width;
    let thumbH = height;

    if (width > height) {
        if (width > maxSize) {
            thumbW = maxSize;
            thumbH = Math.round((height / width) * maxSize);
        }
    } else {
        if (height > maxSize) {
            thumbH = maxSize;
            thumbW = Math.round((width / height) * maxSize);
        }
    }

    const canvas = document.createElement("canvas");
    canvas.width = thumbW;
    canvas.height = thumbH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(img, 0, 0, thumbW, thumbH);
    return canvas.toDataURL("image/png");
}

/**
 * Gets the byte size of a data URL.
 */
function getDataUrlByteSize(dataUrl: string): number {
    // Data URL format: data:[mime];base64,[data]
    const base64 = dataUrl.split(",")[1];
    if (!base64) return 0;
    // Base64 encodes 3 bytes into 4 characters
    return Math.ceil((base64.length * 3) / 4);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Stores an image, automatically deciding between IndexedDB (large) and inline (small).
 *
 * @param dataUrl - The image as a data URL
 * @param projectId - The project this image belongs to
 * @returns Information about the stored image including blob ID and thumbnail
 */
export async function storeImage(
    dataUrl: string,
    projectId: string
): Promise<ImageStoreResult> {
    const byteSize = getDataUrlByteSize(dataUrl);
    const img = await loadImage(dataUrl);
    const thumbnail = await createThumbnail(img);
    const blobId = nanoid();

    if (byteSize > BLOB_THRESHOLD_BYTES) {
        // Large image: store in IndexedDB
        const blob = dataUrlToBlob(dataUrl);
        const mimeType = dataUrl.match(/data:(.*?);/)?.[1] || "image/png";

        const imageBlob: ImageBlob = {
            id: blobId,
            projectId,
            blob,
            mimeType,
            width: img.width,
            height: img.height,
            createdAt: Date.now(),
        };

        await db.imageBlobs.put(imageBlob);

        return {
            blobId,
            thumbnailDataUrl: thumbnail,
            width: img.width,
            height: img.height,
            isStoredAsBlob: true,
        };
    } else {
        // Small image: keep inline (return the original data URL as thumbnail)
        return {
            blobId,
            thumbnailDataUrl: dataUrl, // For small images, use full image as "thumbnail"
            width: img.width,
            height: img.height,
            isStoredAsBlob: false,
        };
    }
}

/**
 * Retrieves the full-resolution image from IndexedDB.
 *
 * @param blobId - The blob ID returned from storeImage
 * @returns The image as a data URL, or null if not found
 */
export async function getFullImage(blobId: string): Promise<string | null> {
    const record = await db.imageBlobs.get(blobId);
    if (!record) return null;

    return blobToDataUrl(record.blob);
}

/**
 * Retrieves the full-resolution image as an HTMLImageElement.
 *
 * @param blobId - The blob ID
 * @returns Loaded HTMLImageElement or null if not found
 */
export async function getFullImageElement(blobId: string): Promise<HTMLImageElement | null> {
    const dataUrl = await getFullImage(blobId);
    if (!dataUrl) return null;

    return loadImage(dataUrl);
}

/**
 * Checks if an image with the given blob ID exists in IndexedDB.
 */
export async function hasStoredImage(blobId: string): Promise<boolean> {
    const record = await db.imageBlobs.get(blobId);
    return !!record;
}

/**
 * Deletes an image from IndexedDB.
 *
 * @param blobId - The blob ID to delete
 */
export async function deleteImage(blobId: string): Promise<void> {
    await db.imageBlobs.delete(blobId);
}

/**
 * Deletes all images associated with a project.
 * Call this when deleting a project to clean up storage.
 *
 * @param projectId - The project ID
 */
export async function deleteProjectImages(projectId: string): Promise<void> {
    await db.imageBlobs.where("projectId").equals(projectId).delete();
}

/**
 * Gets storage statistics for a project.
 */
export async function getProjectImageStats(projectId: string): Promise<{
    count: number;
    totalBytes: number;
}> {
    const images = await db.imageBlobs.where("projectId").equals(projectId).toArray();
    const totalBytes = images.reduce((sum, img) => sum + img.blob.size, 0);
    return { count: images.length, totalBytes };
}

/**
 * Resolves an image source for display or export.
 *
 * If the source is a blob ID reference (starts with "blob:"), loads from IndexedDB.
 * Otherwise returns the source as-is (data URL or regular URL).
 *
 * @param src - The image source (could be data URL, blob ID reference, or URL)
 * @param forExport - If true, always returns full resolution; if false, may return thumbnail
 */
export async function resolveImageSource(
    src: string,
    forExport: boolean = false
): Promise<string> {
    // Check if this is a blob ID reference
    if (src.startsWith("blobref:")) {
        const blobId = src.slice(8); // Remove "blobref:" prefix
        const fullImage = await getFullImage(blobId);
        if (fullImage) {
            return fullImage;
        }
        // Fallback: blob not found, might be corrupted data
        console.warn(`[ImageStore] Blob not found: ${blobId}`);
        return src;
    }

    // Regular data URL or URL - return as-is
    return src;
}

/**
 * Prepares a layer source for storage.
 *
 * For large images, stores in IndexedDB and returns a blob reference.
 * For small images, returns the original data URL.
 *
 * @param dataUrl - The image data URL
 * @param projectId - The project ID
 * @returns Object with src (for storage) and thumbnailSrc (for preview)
 */
export async function prepareLayerSource(
    dataUrl: string,
    projectId: string
): Promise<{
    src: string;           // What to store in layer.src (either data URL or "blobref:id")
    thumbnailSrc: string;  // Small preview for rendering
    width: number;
    height: number;
}> {
    const result = await storeImage(dataUrl, projectId);

    if (result.isStoredAsBlob) {
        return {
            src: `blobref:${result.blobId}`,
            thumbnailSrc: result.thumbnailDataUrl,
            width: result.width,
            height: result.height,
        };
    } else {
        return {
            src: dataUrl, // Small image, keep inline
            thumbnailSrc: dataUrl,
            width: result.width,
            height: result.height,
        };
    }
}
