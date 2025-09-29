export const BUSES = ["system", "ambient", "content"] as const;

export type Bus = (typeof BUSES)[number];
