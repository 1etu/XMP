import type { ContentOption } from "./action.js";
import { profile, projectOf } from "./project.js";

const SELF = new Set(["profile", "about"]);

export function optionsFor(id: string): readonly ContentOption[] {
  if (id === "information-board") {
    return [
      { label: "Display", action: { kind: "board-display", enabled: true } },
      { label: "Do Not Display", action: { kind: "board-display", enabled: false } },
    ];
  }

  const project = projectOf(id);
  if (project === undefined && !SELF.has(id)) {
    return [];
  }

  const options: ContentOption[] = [
    { label: "Information", action: { kind: "information", id } },
  ];

  if (project === undefined) {
    options.push({ label: "GitHub", action: { kind: "link", href: profile.github } });
    options.push({ label: "Website", action: { kind: "link", href: profile.website } });
    options.push({ label: "Details", action: { kind: "document", id } });

    return options;
  }

  if (project.images.length > 0) {
    options.push({ label: "View Images", action: { kind: "gallery", id } });
  }
  if (project.video !== "") {
    options.push({ label: "Play Video", action: { kind: "video", id } });
  }
  if (project.website !== "") {
    options.push({
      label: "Visit Website",
      action: { kind: "browser", href: project.website, title: project.title },
    });
  }

  options.push({ label: "View Source", action: { kind: "link", href: project.source } });
  options.push({ label: "Details", action: { kind: "document", id } });

  return options;
}
