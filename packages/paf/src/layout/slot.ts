export interface Slot {
  readonly id: string;
  readonly icon: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
  readonly focused: boolean;
}

export interface Label {
  readonly id: string;
  readonly text: string;
  readonly info: string;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly alpha: number;
  readonly focused: boolean;
}

export interface Item {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly info: string;
}

export interface View {
  readonly categories: readonly Item[];
  readonly categoryOffset: number;
  readonly items: readonly Item[];
  readonly itemOffset: number;
  readonly depth: number;
  readonly categoryIndex?: number;
  readonly itemAlpha?: number;
  readonly mediaFolder?: boolean;
}

export interface Snapshot {
  readonly categories: readonly Slot[];
  readonly categoryLabel: Label | undefined;
  readonly categoryLabels: readonly Label[];
  readonly items: readonly Slot[];
  readonly labels: readonly Label[];
}
