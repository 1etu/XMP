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
