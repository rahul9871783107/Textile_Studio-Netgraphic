import { create } from "zustand";
import { useEffect } from "react";

// ============================================================================
// Toast Store
// ============================================================================

export type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastStore {
    toasts: Toast[];
    _addToast: (toast: Toast) => void;
    _removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    _addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
    _removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ============================================================================
// Public API
// ============================================================================

let toastCounter = 0;

/**
 * Show a toast notification.
 * Can be called from anywhere in the app.
 *
 * @param message - The message to display
 * @param type - 'success' | 'error' | 'info'
 * @param duration - How long to show the toast in ms (default: 4000)
 */
export function showToast(
    message: string,
    type: ToastType = "info",
    duration = 4000
): void {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    useToastStore.getState()._addToast({ id, message, type, duration });
}

/**
 * Convenience function for success toasts
 */
export function showSuccess(message: string, duration?: number): void {
    showToast(message, "success", duration);
}

/**
 * Convenience function for error toasts
 */
export function showError(message: string, duration?: number): void {
    showToast(message, "error", duration ?? 6000); // Errors show longer
}

// ============================================================================
// Toast Component
// ============================================================================

function ToastItem({ toast }: { toast: Toast }) {
    const removeToast = useToastStore((s) => s._removeToast);

    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, removeToast]);

    const typeStyles: Record<ToastType, React.CSSProperties> = {
        success: {
            background: "linear-gradient(135deg, #059669, #10b981)",
            borderColor: "#34d399",
        },
        error: {
            background: "linear-gradient(135deg, #dc2626, #ef4444)",
            borderColor: "#f87171",
        },
        info: {
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            borderColor: "#818cf8",
        },
    };

    const icons: Record<ToastType, string> = {
        success: "\u2713", // checkmark
        error: "\u2717",   // x mark
        info: "\u2139",    // info
    };

    return (
        <div
            style={{
                ...typeStyles[toast.type],
                color: "#fff",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                maxWidth: "400px",
                animation: "toastSlideIn 0.25s ease-out",
                cursor: "pointer",
            }}
            onClick={() => removeToast(toast.id)}
            title="Click to dismiss"
        >
            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                {icons[toast.type]}
            </span>
            <span style={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
                {toast.message}
            </span>
        </div>
    );
}

/**
 * Toast container component.
 * Add this once at the root of your app (e.g., in App.tsx).
 */
export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);

    if (toasts.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes toastSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>
            <div
                style={{
                    position: "fixed",
                    top: "70px",
                    right: "20px",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    pointerEvents: "none",
                }}
            >
                {toasts.map((toast) => (
                    <div key={toast.id} style={{ pointerEvents: "auto" }}>
                        <ToastItem toast={toast} />
                    </div>
                ))}
            </div>
        </>
    );
}

export default ToastContainer;
