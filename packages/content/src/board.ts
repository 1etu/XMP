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

export const boardChannels = [
  { id: "all", title: "All news" },
  { id: "graphics", title: "Graphics" },
  { id: "interfaces", title: "Interfaces" },
  { id: "tools", title: "Tools" },
  { id: "site", title: "This site" },
] as const;
