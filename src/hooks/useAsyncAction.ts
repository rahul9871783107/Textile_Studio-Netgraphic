import { useState, useCallback } from 'react';

export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
    action: T
): {
    execute: T;
    isLoading: boolean;
    error: string | null;
} {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (...args: Parameters<T>) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await action(...args);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [action]) as T;

    return { execute, isLoading, error };
}
