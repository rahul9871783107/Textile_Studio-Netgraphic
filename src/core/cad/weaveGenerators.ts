import type { WeaveModel } from "../../types/weaveModel";

/**
 * Apply 2×2 Twill tie-up pattern
 * Creates a diagonal pattern with 2 up, 2 down
 */
export function apply2x2Twill(model: WeaveModel): void {
    const { harnessCount, treadleCount } = model;
    const tieUp = new Uint8Array(harnessCount * treadleCount);

    for (let h = 0; h < harnessCount; h++) {
        for (let t = 0; t < treadleCount; t++) {
            // 2 up, 2 down pattern
            const pos = (h + t) % harnessCount;
            tieUp[h * treadleCount + t] = pos < 2 ? 1 : 0;
        }
    }

    model.tieUp = tieUp;
}

/**
 * Apply 3×1 Twill tie-up pattern
 * Creates a pronounced diagonal (warp-dominant)
 */
export function apply3x1Twill(model: WeaveModel): void {
    const { harnessCount, treadleCount } = model;
    const tieUp = new Uint8Array(harnessCount * treadleCount);

    for (let h = 0; h < harnessCount; h++) {
        for (let t = 0; t < treadleCount; t++) {
            const pos = (h + t) % harnessCount;
            tieUp[h * treadleCount + t] = pos < 3 ? 1 : 0;
        }
    }

    model.tieUp = tieUp;
}

/**
 * Apply Basket weave pattern
 * Groups threads in pairs for checked effect
 */
export function applyBasket(model: WeaveModel): void {
    const { warpCount, weftCount, harnessCount, treadleCount } = model;

    // Modify threading: pair threads
    for (let i = 0; i < warpCount; i++) {
        model.threading[i] = Math.floor(i / 2) % harnessCount;
    }

    // Modify treadling: pair picks
    for (let i = 0; i < weftCount; i++) {
        model.treadling[i] = Math.floor(i / 2) % treadleCount;
    }

    // Plain weave tie-up
    const tieUp = new Uint8Array(harnessCount * treadleCount);
    for (let i = 0; i < Math.min(harnessCount, treadleCount); i++) {
        tieUp[i * treadleCount + i] = 1;
    }
    model.tieUp = tieUp;
}

/**
 * Apply Herringbone pattern
 * Threading reverses direction creating V shapes
 */
export function applyHerringbone(model: WeaveModel): void {
    const { warpCount, harnessCount } = model;

    // Point threading - goes up then down
    const pointWidth = harnessCount * 2 - 2;
    for (let i = 0; i < warpCount; i++) {
        const pos = i % pointWidth;
        if (pos < harnessCount) {
            model.threading[i] = pos;
        } else {
            model.threading[i] = harnessCount - 2 - (pos - harnessCount);
        }
    }

    // 2/2 twill tie-up
    apply2x2Twill(model);
}

/**
 * Apply Diamond pattern
 * Both threading and treadling reverse, creating diamonds
 */
export function applyDiamond(model: WeaveModel): void {
    const { warpCount, weftCount, harnessCount, treadleCount } = model;

    // Point threading
    const pointWidth = harnessCount * 2 - 2;
    for (let i = 0; i < warpCount; i++) {
        const pos = i % pointWidth;
        if (pos < harnessCount) {
            model.threading[i] = pos;
        } else {
            model.threading[i] = harnessCount - 2 - (pos - harnessCount);
        }
    }

    // Point treadling
    const pointHeight = treadleCount * 2 - 2;
    for (let i = 0; i < weftCount; i++) {
        const pos = i % pointHeight;
        if (pos < treadleCount) {
            model.treadling[i] = pos;
        } else {
            model.treadling[i] = treadleCount - 2 - (pos - treadleCount);
        }
    }

    // 2/2 twill tie-up
    apply2x2Twill(model);
}

/**
 * Apply straight draw threading
 */
export function applyStraightDraw(model: WeaveModel): void {
    for (let i = 0; i < model.warpCount; i++) {
        model.threading[i] = i % model.harnessCount;
    }
    for (let i = 0; i < model.weftCount; i++) {
        model.treadling[i] = i % model.treadleCount;
    }
}

/**
 * Apply plain weave tie-up
 */
export function applyPlainWeave(model: WeaveModel): void {
    const { harnessCount, treadleCount } = model;
    const tieUp = new Uint8Array(harnessCount * treadleCount);

    for (let i = 0; i < Math.min(harnessCount, treadleCount); i++) {
        tieUp[i * treadleCount + i] = 1;
    }

    model.tieUp = tieUp;
}
