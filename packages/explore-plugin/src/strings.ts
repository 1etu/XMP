export interface StringsFile {
  readonly text: Readonly<Record<string, string>>;
}

export interface Strings {
  of(key: string): string;
  has(key: string): boolean;
  readonly missing: readonly string[];
}
