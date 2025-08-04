import type { ContentOption } from "./action.js";
import { optionsFor } from "./option.js";
import { profile, projectOf, repoOf } from "./project.js";

export interface Information {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly paragraphs: readonly string[];
  readonly rows: readonly (readonly [string, string])[];
  readonly options: readonly ContentOption[];
}

const INTERESTS: Information = {
  id: "interests",
  title: "Technical Interests",
  subtitle: "From my public projects",
  icon: "",
  paragraphs: [
    "GPU simulation, browser interfaces, procedural graphics, and driving tools.",
    "These interests reflect the projects in this portfolio.",
  ],
  rows: [
    ["Graphics", "MeltGL"],
    ["Interfaces", "nOS4"],
    ["Procedural generation", "Fingerprints"],
    ["Driving tools", "cohesi"],
  ],
  options: [],
};

const CONTROLS: Information = {
  id: "controls",
  title: "Controls",
  subtitle: "Select, confirm, and return",
  icon: "",
  paragraphs: [
    "Move between categories horizontally and select items vertically. Open an item to view its information. Use Options for related actions.",
    "On a phone, swipe across the background to navigate. Tap a title to open it. Scroll text and media controls directly.",
  ],
  rows: [
    ["Select", "Arrow keys / D-pad"],
    ["Confirm", "Enter / Cross"],
    ["Back", "Esc / Circle"],
    ["Options", "T / Triangle"],
    ["Pointer", "Select an icon or open a title"],
  ],
  options: [],
};

export function informationOf(id: string): Information | undefined {
  const project = projectOf(id);

  if (project !== undefined) {
    return {
      id,
      title: project.title,
      subtitle: project.description,
      icon: project.icon,
      paragraphs: project.paragraphs,
      rows: [
        ["Type", "Project"],
        ["Language", project.language],
        ["Repository", repoOf(project)],
      ],
      options: optionsFor(id),
    };
  }

  if (id === "profile" || id === "about") {
    return {
      id,
      title: profile.handle,
      subtitle: `@${profile.handle}`,
      icon: profile.avatar,
      paragraphs: profile.biography,
      rows: [
        ["Name", profile.name],
        ["Location", profile.location],
        ["Website", profile.website.replace("https://", "")],
      ],
      options: optionsFor(id),
    };
  }

  if (id === "interests") {
    return { ...INTERESTS, icon: profile.avatar };
  }

  return id === "controls" ? CONTROLS : undefined;
}
