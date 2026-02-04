/**
 * Debounce Utility
 *
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last call.
 */

/**
 * Creates a debounced version of the provided function.
 *
 * @param fn - The function to debounce
 * @param ms - The debounce delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    ms: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            fn(...args);
            timer = null;
        }, ms);
    };
}

/**
 * Creates a debounced version with leading edge execution.
 * The function is called immediately on first call, then debounced.
 *
 * @param fn - The function to debounce
 * @param ms - The debounce delay in milliseconds
 * @returns A debounced version of the function with leading edge execution
 */
export function debounceLeading<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let shouldCall = true;

    return (...args: Parameters<T>) => {
        if (shouldCall) {
            fn(...args);
            shouldCall = false;
        }

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            shouldCall = true;
            timer = null;
        }, ms);
    };
}
