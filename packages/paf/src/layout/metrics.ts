export interface Logical {
  readonly wid: number;
  readonly hgt: number;
}

export interface Frac {
  readonly focusX: number;
  readonly categoryPitchX: number;
  readonly categoryFocusGapX?: number;
  readonly categoryIconY: number;
  readonly categoryFocusRiseY?: number;
  readonly categoryLabelY: number;
  readonly focusItemY: number;
  readonly itemPitchY: number;
  readonly focusGapY: number;
  readonly focusGapAboveY: number;
  readonly focusIconSize: number;
  readonly itemLabelX: number;
  readonly otherLabelOffsetX?: number;
  readonly otherLabelOffsetY?: number;
  readonly aboveLabelOffsetY?: number;
  readonly infoPanelY: number;
}
