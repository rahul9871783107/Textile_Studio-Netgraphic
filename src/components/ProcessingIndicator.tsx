/**
 * Processing Indicator Component
 *
 * Shows a progress overlay when image processing is happening in the worker.
 */

import { useProcessingStore } from "../core/imaging/imageProcessorClient";

export default function ProcessingIndicator() {
    const { isProcessing, progress, message } = useProcessingStore();

    if (!isProcessing) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 8,
                    padding: "24px 32px",
                    minWidth: 300,
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                }}
            >
                <div
                    style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#374151",
                        marginBottom: 12,
                    }}
                >
                    {message || "Processing..."}
                </div>

                {/* Progress bar */}
                <div
                    style={{
                        height: 8,
                        backgroundColor: "#e5e7eb",
                        borderRadius: 4,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${progress}%`,
                            backgroundColor: "#6366f1",
                            borderRadius: 4,
                            transition: "width 0.2s ease-out",
                        }}
                    />
                </div>

                <div
                    style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        marginTop: 8,
                        textAlign: "center",
                    }}
                >
                    {progress}%
                </div>
            </div>
        </div>
    );
}
