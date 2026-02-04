import type { WeaveModel } from "../../types/weaveModel";

/**
 * Validate weave model against loom constraints
 * @returns Array of error/warning messages
 */
export function validateWeave(model: WeaveModel): string[] {
    const errors: string[] = [];

    if (model.harnessCount > model.loom.maxHarness) {
        errors.push(`Harness count (${model.harnessCount}) exceeds loom capacity (${model.loom.maxHarness})`);
    }

    if (model.treadleCount > model.loom.maxTreadle) {
        errors.push(`Treadle count (${model.treadleCount}) exceeds loom capacity (${model.loom.maxTreadle})`);
    }

    if (model.warpCount > model.loom.maxWarp) {
        errors.push(`Warp count (${model.warpCount}) exceeds loom capacity (${model.loom.maxWarp})`);
    }

    if (model.weftCount > model.loom.maxWeft) {
        errors.push(`Weft count (${model.weftCount}) exceeds loom capacity (${model.loom.maxWeft})`);
    }

    // Check for empty tie-up
    const hasTieUp = model.tieUp.some(v => v === 1);
    if (!hasTieUp) {
        errors.push("Tie-up is empty - no pattern will be generated");
    }

    // Check threading/treadling bounds
    for (let i = 0; i < model.warpCount; i++) {
        if (model.threading[i] >= model.harnessCount) {
            errors.push(`Threading at position ${i + 1} references invalid harness`);
            break;
        }
    }

    for (let i = 0; i < model.weftCount; i++) {
        if (model.treadling[i] >= model.treadleCount) {
            errors.push(`Treadling at position ${i + 1} references invalid treadle`);
            break;
        }
    }

    return errors;
}

/**
 * Check if model is within loom constraints
 */
export function isWithinLoomLimits(model: WeaveModel): boolean {
    return validateWeave(model).length === 0;
}
