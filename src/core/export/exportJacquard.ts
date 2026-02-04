import type { JacquardModel } from "../../types/jacquardModel";
import { generateJacquardDrawdown } from "../../core/cad/jacquardDrawdown";
import { getContext2D } from "../imaging/canvasUtils";

/**
 * Export jacquard structure map as grayscale bitmap
 * Each structure gets a different gray level for CAM software
 */
export function exportJacquardBitmap(model: JacquardModel): string {
    const { width, height, grid, structures } = model;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = getContext2D(canvas);
    const img = ctx.createImageData(width, height);

    // Calculate gray level per structure (evenly distributed)
    const grayStep = structures.length > 1 ? 255 / (structures.length - 1) : 255;

    for (let i = 0; i < grid.length; i++) {
        const structIdx = grid[i];
        const grayValue = Math.round(structIdx * grayStep);

        img.data[i * 4] = grayValue;
        img.data[i * 4 + 1] = grayValue;
        img.data[i * 4 + 2] = grayValue;
        img.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Export fabric simulation as PNG
 */
export function exportJacquardSimulation(model: JacquardModel, cellSize = 1): string {
    const { width, height, warpColors, weftColors } = model;
    const drawdown = generateJacquardDrawdown(model);

    const canvas = document.createElement("canvas");
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    const ctx = getContext2D(canvas);
    const img = ctx.createImageData(width * cellSize, height * cellSize);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isWarpUp = drawdown[y * width + x] === 1;

            const color = isWarpUp
                ? warpColors[x % warpColors.length] ?? "#1e3a5f"
                : weftColors[y % weftColors.length] ?? "#f5f5dc";

            // Parse hex color
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);

            // Fill cell
            for (let cy = 0; cy < cellSize; cy++) {
                for (let cx = 0; cx < cellSize; cx++) {
                    const px = x * cellSize + cx;
                    const py = y * cellSize + cy;
                    const idx = (py * width * cellSize + px) * 4;
                    img.data[idx] = r;
                    img.data[idx + 1] = g;
                    img.data[idx + 2] = b;
                    img.data[idx + 3] = 255;
                }
            }
        }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Export structure map as JSON for CAM adapters
 */
export function exportJacquardStructureMap(model: JacquardModel): string {
    const structureMap = {
        width: model.width,
        height: model.height,
        warpDensity: model.warpDensity,
        weftDensity: model.weftDensity,
        structures: model.structures.map(s => ({
            id: s.id,
            name: s.name,
            harnessCount: s.harnessCount,
            treadleCount: s.treadleCount,
            threading: Array.from(s.threading),
            treadling: Array.from(s.treadling),
            tieUp: Array.from(s.tieUp),
        })),
        grid: Array.from(model.grid),
    };

    return JSON.stringify(structureMap, null, 2);
}

/**
 * Download jacquard exports as a bundle
 */
export function downloadJacquardBundle(model: JacquardModel, projectName = "jacquard"): void {
    // Download structure map bitmap
    const bitmapUrl = exportJacquardBitmap(model);
    const bitmapLink = document.createElement("a");
    bitmapLink.href = bitmapUrl;
    bitmapLink.download = `${projectName}-structure-map.png`;
    bitmapLink.click();

    // Download fabric simulation
    const simUrl = exportJacquardSimulation(model, 2);
    const simLink = document.createElement("a");
    simLink.href = simUrl;
    simLink.download = `${projectName}-simulation.png`;
    simLink.click();

    // Download structure JSON
    const jsonData = exportJacquardStructureMap(model);
    const jsonBlob = new Blob([jsonData], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = `${projectName}-structures.json`;
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);
}
