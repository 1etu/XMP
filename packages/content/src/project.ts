import { catalog } from "./catalog.js";

export interface Project {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly language: string;
  readonly source: string;
  readonly website: string;
  readonly icon: string;
  readonly images: readonly { readonly src: string; readonly title: string }[];
  readonly video: string;
  readonly paragraphs: readonly string[];
}

export interface Folder {
  readonly id: string;
  readonly title: string;
  readonly projects: readonly string[];
}

export const profile = catalog.profile;
