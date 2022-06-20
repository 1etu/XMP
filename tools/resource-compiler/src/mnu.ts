const HDR = "#MNU_1.0";

export type Kind = "int" | "float";
export type Block = Readonly<Record<string, number>>;
export type Kinds = Readonly<Record<string, Kind>>;
