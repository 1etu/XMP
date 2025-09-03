import type { Category, Entry } from "@vsh/explore-plugin";

import { indexOfProject, profile, projectFolders, projects } from "./project.js";

const ICON_AVATAR = 100;
const ICON_BOARD = 105;
const ICON_WHATS_NEW = 106;
const ICON_ORB = 71;
const ICON_FOLDER = 80;
const ICON_PROJECT = 120;

function entry(id: string, title: string, info: string, icon: number): Entry {
  return { id, title, info, icon, action: id, childPos: 0, entries: [] };
}

function themeSettings(): Entry {
  return {
    ...entry("theme-settings", "Theme Settings", "Adjust the appearance of the XMB™ screen.", 24),
    entries: [
      entry("theme", "Theme", "Select a theme.", 23),
      entry("color", "Colour", "Sets the color of the background and options menu.", 23),
      entry("background", "Background", "Sets the background of the XMB™ screen.", 23),
      entry("font", "Font", "Sets the font used on the XMB™ screen.", 23),
    ],
  };
}

function projectShelf(): readonly Entry[] {
  return projectFolders.map((folder) => ({
    ...entry(
      `folder-${folder.id}`,
      folder.title,
      `${String(folder.projects.length)} projects`,
      ICON_FOLDER,
    ),
    entries: folder.projects.flatMap((id) => {
      const index = indexOfProject(id);
      const project = projects[index];

      return project === undefined
        ? []
        : [entry(project.id, project.title, project.description, ICON_PROJECT + index)];
    }),
  }));
}
