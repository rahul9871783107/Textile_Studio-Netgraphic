import type { ProjectRow } from "../types/project";

// Lazy imports for code splitting
import { lazy, Suspense } from "react";

const PrintEditor = lazy(() => import("./print/PrintEditor"));
const WeaveEditor = lazy(() => import("./weave/WeaveEditor"));
const KnitEditor = lazy(() => import("./knit/KnitEditor"));
const JacquardEditor = lazy(() => import("./jacquard/JacquardEditor"));
const TuftEditor = lazy(() => import("./tuft/TuftEditor"));

function LoadingFallback() {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#6b7280",
            fontSize: "0.9rem"
        }}>
            Loading editor...
        </div>
    );
}

export default function ModuleRouter({ project }: { project: ProjectRow }) {
    const type = project.type ?? "print";

    return (
        <Suspense fallback={<LoadingFallback />}>
            {type === "weave" && <WeaveEditor project={project} />}
            {type === "knit" && <KnitEditor project={project} />}
            {type === "jacquard" && <JacquardEditor project={project} />}
            {type === "tuft" && <TuftEditor project={project} />}
            {type === "print" && <PrintEditor project={project} />}
        </Suspense>
    );
}
