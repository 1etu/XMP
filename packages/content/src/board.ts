import { catalog } from "./catalog.js";

export interface BoardItem {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly image: string;
  readonly paragraphs: readonly string[];
  readonly href?: string;
  readonly channel: "site" | "graphics" | "interfaces" | "tools";
}
