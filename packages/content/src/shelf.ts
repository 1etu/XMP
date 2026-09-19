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

export function portfolioCategories(): readonly Category[] {
  return [
    {
      id: "user",
      title: "About Me",
      icon: 1,
      entries: [entry("profile", profile.handle, "", ICON_AVATAR)],
    },
    {
      id: "settings",
      title: "Settings",
      icon: 2,
      entries: [
        themeSettings(),
        entry("motion", "Motion", "Set the amount of animation.", 57),
        entry("controls", "Controls", "View navigation controls.", 6),
        entry("system-information", "System Information", "", 13),
        entry("about-site", "About This Site", "", 13),
      ],
    },
    { id: "works", title: "Projects", icon: 6, entries: projectShelf() },
    {
      id: "network",
      title: "Network",
      icon: 7,
      entries: [
        entry("information-board", "Information Board", "", ICON_BOARD),
        entry("internet-browser", "Internet Browser", "", 7),
        entry("github", "GitHub", "Repositories and source code.", 7),
        entry("website", "dayetu.group", "Visit my website.", 7),
      ],
    },
    {
      id: "psn",
      title: "What's New",
      icon: ICON_ORB,
      entries: [entry("whats-new", "What's New", "", ICON_WHATS_NEW)],
    },
  ];
}

export function portfolioIcons(): Readonly<Record<number, string>> {
  const entries: [number, string][] = [
    [ICON_AVATAR, profile.avatar],
    [ICON_BOARD, "/xmb/icons/information-board.png"],
    [ICON_WHATS_NEW, "/xmb/icons/whats-new.png"],
    [ICON_ORB, "/xmb/icons/network.png"],
    [ICON_FOLDER, "/xmb/icons/folder.png"],
    ...projects.map((p, i): [number, string] => [ICON_PROJECT + i, p.icon]),
  ];

  return Object.fromEntries(entries);
}
