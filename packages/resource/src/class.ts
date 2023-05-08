export const CLASSES = ["VERIFIED", "MEASURED", "DESIGN", "PROJECT", "INFERRED"] as const;

export type Class = (typeof CLASSES)[number];

const EVIDENCE: Readonly<Record<Class, number>> = {
  VERIFIED: 0,
  MEASURED: 1,
  DESIGN: 2,
  PROJECT: 3,
  INFERRED: 4,
};

export function isClass(v: string): v is Class {
  return (CLASSES as readonly string[]).includes(v);
}
