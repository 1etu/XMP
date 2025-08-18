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

export const projectFolders: readonly Folder[] = [
  { id: "fun", title: "Fun", projects: ["nos4", "cohesi", "gitdraw"] },
  { id: "libraries", title: "Libraries", projects: ["meltgl", "actual-fingerprints"] },
  {
    id: "networking",
    title: "Networking",
    projects: ["turkeydpi", "easyupoo", "easyupoo-seed"],
  },
  {
    id: "utilities",
    title: "Utilities",
    projects: ["toorker", "rest", "alfred", "osp-tools"],
  },
];

export const projects: readonly Project[] = projectFolders
  .flatMap((folder) => folder.projects)
  .flatMap((id) => {
    const project = catalog.projects.find((item) => item.id === id);
    return project === undefined ? [] : [project];
  });

export function projectOf(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}

export function indexOfProject(id: string): number {
  return projects.findIndex((project) => project.id === id);
}
