export const CLASSES = ["VERIFIED", "MEASURED", "DESIGN", "PROJECT", "INFERRED"] as const;

export type Class = (typeof CLASSES)[number];
