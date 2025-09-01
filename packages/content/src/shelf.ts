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
