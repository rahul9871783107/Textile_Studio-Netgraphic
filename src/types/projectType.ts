export type ProjectType =
    | "print"
    | "weave"
    | "knit"
    | "jacquard"
    | "tuft";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
    print: "Print / Surface",
    weave: "Weave",
    knit: "Knit",
    jacquard: "Jacquard",
    tuft: "Tuft / Carpet",
};
