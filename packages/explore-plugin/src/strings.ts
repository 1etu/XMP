export interface StringsFile {
  readonly text: Readonly<Record<string, string>>;
}

export interface Strings {
  of(key: string): string;
  has(key: string): boolean;
  readonly missing: readonly string[];
}

export function strings(file: StringsFile): Strings {
  const gone = new Set<string>();

  return {
    of(key: string): string {
      if (key.length === 0) {
        return "";
      }

      const hit = file.text[key];
      if (hit === undefined) {
        gone.add(key);
        return key;
      }

      return hit;
    },

    has(key: string): boolean {
      return file.text[key] !== undefined;
    },

    get missing(): readonly string[] {
      return [...gone].sort();
    },
  };
}
