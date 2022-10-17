import * as Xmbml from "./xmbml.ts";

const ROOT_VIEW = "root";
const MAX_DEPTH = 4;
const KEY_ICON = "icon_rsc";
const KEY_TITLE = "title_rsc";
const KEY_INFO = "info_rsc";
const KEY_CHILD = "child";
const KEY_POS = "ch_pos";
const KEY_ACTION = "bar_action";
const ACT_NONE = "none";

export interface Item {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly info: string;
  readonly action: string;
  readonly childPos: number;
  readonly items: readonly Item[];
}

export interface Category {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly items: readonly Item[];
}

export interface Provided {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly info?: string;
}

export interface Meta {
  readonly icon: string;
  readonly title: string;
  readonly xml: string;
  readonly railOnly?: boolean;
}

export interface Spec {
  readonly order: readonly string[];
  readonly categories: Readonly<Record<string, Meta>>;
  readonly providers: Readonly<Record<string, readonly Provided[]>>;
  readonly attrs: Readonly<Record<string, Provided>>;
  readonly drop: readonly string[];
}

export class BuildError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "TreeBuildError";
    this.detail = detail;
  }
}
