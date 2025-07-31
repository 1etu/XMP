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
