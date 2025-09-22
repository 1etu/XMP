import { catalog } from "./catalog.js";
import type { ContentAction } from "./index.js";

export interface WhatsNewItem {
  readonly id: string;
  readonly title: string;
  readonly image: string;
  readonly artwork: boolean;
  readonly type: "web" | "video" | "project";
  readonly action: ContentAction;
}
