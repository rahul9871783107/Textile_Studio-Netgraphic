/**
 * Convert artwork image to jacquard grid
 * 
 * Strategy:
 * 1. Load image as ImageData
 * 2. Convert to grayscale
 * 3. Map grayscale values to structure indices
 */

/**
 * Convert dataUrl to ImageData
 */
async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Convert image to jacquard grid by mapping grayscale to structure indices
 * 
 * @param imageDataUrl - Source image as dataUrl
 * @param width - Target jacquard grid width (warp ends)
 * @param height - Target jacquard grid height (picks)
 * @param structureCount - Number of available structures
 * @returns Uint16Array grid mapping each cell to a structure index
 */
export async function imageToJacquardGrid(
    imageDataUrl: string,
    width: number,
    height: number,
    structureCount: number
): Promise<Uint16Array> {
    const img = await dataUrlToImageData(imageDataUrl);
    const out = new Uint16Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Map output coordinates to source image
            const ix = Math.floor((x / width) * img.width);
            const iy = Math.floor((y / height) * img.height);
            const p = (iy * img.width + ix) * 4;

            // Get RGB values
            const r = img.data[p];
            const g = img.data[p + 1];
            const b = img.data[p + 2];

            // Convert to grayscale
            const gray = (r * 0.299 + g * 0.587 + b * 0.114);

            // Map to structure index
            const idx = Math.floor((gray / 255) * structureCount);
            out[y * width + x] = Math.min(idx, structureCount - 1);
        }
    }

    return out;
}

/**
 * Convert image to jacquard grid using color quantization
 * Maps each distinct color region to a different structure
 * 
 * @param imageDataUrl - Source image as dataUrl
 * @param width - Target grid width
 * @param height - Target grid height
 * @param colorToStructure - Map of hex colors to structure indices
 */
export async function imageToJacquardByColor(
    imageDataUrl: string,
    width: number,
    height: number,
    colorToStructure: Map<string, number>
): Promise<Uint16Array> {
    const img = await dataUrlToImageData(imageDataUrl);
    const out = new Uint16Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const ix = Math.floor((x / width) * img.width);
            const iy = Math.floor((y / height) * img.height);
            const p = (iy * img.width + ix) * 4;

            const r = img.data[p];
            const g = img.data[p + 1];
            const b = img.data[p + 2];

            // Convert to hex
            const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

            // Find closest color in map
            const structureIdx = colorToStructure.get(hex) ?? 0;

            out[y * width + x] = structureIdx;
        }
    }

    return out;
}
