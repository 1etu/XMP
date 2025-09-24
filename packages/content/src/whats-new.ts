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

const FEATURED = [
  "nos4",
  "meltgl",
  "actual-fingerprints",
  "cohesi",
  "turkeydpi",
  "gitdraw",
  "alfred",
  "rest",
  "toorker",
];

export const whatsNewItems: readonly WhatsNewItem[] = FEATURED.flatMap((id) => {
  const project = catalog.projects.find((item) => item.id === id);
  if (project === undefined) return [];
  const type =
    project.video !== "" ? "video" : project.website !== "" ? "web" : "project";
  return [
    {
      id: project.id,
      title: project.title + (type === "video" ? " — Video" : ""),
      image: project.images[0]?.src ?? project.icon,
      artwork: project.images.length === 0,
      type,
      action:
        type === "video"
          ? { kind: "video", id: project.id }
          : type === "web"
            ? { kind: "browser", href: project.website, title: project.title }
            : { kind: "information", id: project.id },
    },
  ];
});
