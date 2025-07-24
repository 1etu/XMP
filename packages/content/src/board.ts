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

export type BoardChannel = (typeof boardChannels)[number]["id"];

const channels: Readonly<Record<string, BoardItem["channel"]>> = {
  meltgl: "graphics",
  "actual-fingerprints": "graphics",
  nos4: "interfaces",
  cohesi: "tools",
};

export const boardItems: readonly BoardItem[] = [
  {
    id: "welcome",
    title: "Welcome to the Information Board",
    date: catalog.retrievedAt,
    image: catalog.profile.avatar,
    paragraphs: [
      "Browse notes from Ege’s portfolio, then open a project to explore it.",
      "The board includes graphics experiments, browser interfaces, and tools. Use the channel control to choose a subject.",
    ],
    channel: "site",
  },
  ...catalog.projects.flatMap((project): readonly BoardItem[] => {
    const channel = channels[project.id];
    return channel === undefined
      ? []
      : [
          {
            id: project.id,
            title: `${project.title}: ${project.description}`,
            date: catalog.retrievedAt,
            image: project.icon,
            paragraphs: project.paragraphs,
            href: project.website || project.source,
            channel,
          },
        ];
  }),
  {
    id: "graphics-notes",
    title: "Experiments in browser graphics",
    date: catalog.retrievedAt,
    image: "/portfolio/MeltGL/icon.png",
    paragraphs: [
      "MeltGL explores fluid simulation on the GPU. Fingerprints builds procedural images from a seed.",
      "Both projects offer a browser demo and public source code. Open Libraries under Projects to see their images and details.",
    ],
    href: "https://github.com/1etu/MeltGL",
    channel: "graphics",
  },
  {
    id: "source-code",
    title: "Read the source behind the projects",
    date: catalog.retrievedAt,
    image: catalog.profile.avatar,
    paragraphs: [
      "The projects in this portfolio have public repositories on GitHub. Each project page links to its source.",
      "Open the website link to browse Ege’s repositories.",
    ],
    href: catalog.profile.github,
    channel: "tools",
  },
  {
    id: "about-this-site",
    title: "A portfolio inspired by the XrossMediaBar",
    date: catalog.retrievedAt,
    image: catalog.profile.avatar,
    paragraphs: [
      "This portfolio takes its inspiration from the PlayStation 3 interface. Move across categories, select an item, and open its information.",
      "The board contains local portfolio notes. Their dates identify the content snapshot. It does not receive Sony news.",
      "This is an independent project and is not affiliated with Sony Interactive Entertainment.",
    ],
    channel: "site",
  },
];
