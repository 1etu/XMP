export const catalog = {
  retrievedAt: "2026-09-19",
  profile: {
    name: "Ege",
    handle: "1etu",
    location: "Bucharest, Romania",
    biography: ["I work on VC projects and make things in my spare time."],
    avatar: "/portfolio/avatar.png",
    github: "https://github.com/1etu",
    website: "https://dayetu.group",
    source: "https://api.github.com/users/1etu",
  },
  projects: [
    {
      id: "meltgl",
      title: "MeltGL",
      description:
        "Melts images and video in the browser with a real fluid simulation on the GPU",
      language: "TypeScript",
      source: "https://github.com/1etu/MeltGL",
      website: "https://1etu.github.io/MeltGL/",
      icon: "/portfolio/MeltGL/icon.png",
      images: [
        {
          src: "/portfolio/MeltGL/demo.png",
          title: "Fluid simulation",
        },
      ],
      video: "/portfolio/MeltGL/demo.mp4",
      paragraphs: [
        "A fluid simulation that melts images and video in the browser. Heat changes viscosity, gravity pulls the material down, and surface tension shapes the drops.",
        "The GPU solver moves the image with the material. The project includes material presets, playback controls, and experiments that show individual physical effects.",
      ],
    },
    {
      id: "nos4",
      title: "nOS4",
      description: "A complete iOS 4 recreation on the Web",
      language: "TypeScript",
      source: "https://github.com/1etu/nos4",
      website: "https://nos4.fun",
      icon: "/portfolio/nos4/icon.png",
      images: [
        {
          src: "/portfolio/nos4/intro.png",
          title: "Introduction",
        },
        {
          src: "/portfolio/nos4/apps.png",
          title: "Applications",
        },
        {
          src: "/portfolio/nos4/safari.png",
          title: "Safari",
        },
      ],
      video: "",
      paragraphs: [
        "A recreation of iOS 4 in the browser, with 23 apps and a framework-based architecture.",
        "The project includes the home screen, folders, multitasking, and apps such as Safari, Photos, Maps, and iPod. It uses TypeScript and SolidJS.",
      ],
    },
    {
      id: "actual-fingerprints",
      title: "Fingerprints",
      description:
        "Deterministic synthetic fingerprints from a seed. Zero dependencies, Node.",
      language: "TypeScript",
      source: "https://github.com/1etu/actual-fingerprints",
      website: "https://1etu.github.io/actual-fingerprints/",
      icon: "/portfolio/actual-fingerprints/icon.png",
      images: [
        {
          src: "/portfolio/actual-fingerprints/samples.png",
          title: "Fingerprint samples",
        },
        {
          src: "/portfolio/actual-fingerprints/pipeline.png",
          title: "Generation pipeline",
        },
      ],
      video: "",
      paragraphs: [
        "A deterministic generator for synthetic fingerprints. The same seed produces the same print without a stored image.",
        "The library supports ridge generation, minutiae extraction, SVG and PNG output, ink effects, and comparison. It was built for a game server that needed a print for each character.",
      ],
    },
    {
      id: "gitdraw",
      title: "gitdraw",
      description:
        "Create art on your GitHub contribution graph using a simple GUI and CLI.",
      language: "HTML",
      source: "https://github.com/1etu/gitdraw",
      website: "",
      icon: "/portfolio/gitdraw/icon.svg",
      images: [
        {
          src: "/portfolio/gitdraw/preview.png",
          title: "gitdraw",
        },
      ],
      video: "",
      paragraphs: [
        "A visual editor and command-line tool for contribution-graph artwork.",
        "Draw pixels or enter text, preview the graph, and generate commits through git fast-import. Desktop releases support Windows and macOS.",
      ],
    },
    {
      id: "turkeydpi",
      title: "TurkeyDPI",
      description:
        "Anti-censorship proxy for Turkey - fragments packets to bypass SNI-based website blocking",
      language: "Rust",
      source: "https://github.com/1etu/turkeydpi",
      website: "",
      icon: "/portfolio/turkeydpi/icon.svg",
      images: [],
      video: "",
      paragraphs: [
        "A proxy that divides TLS and HTTP requests across TCP segments. It also supports DNS-over-HTTPS.",
        "The project includes diagnostic presets, a command-line interface, and desktop controls for Windows and macOS.",
      ],
    },
    {
      id: "alfred",
      title: "alfred",
      description: "one place for the things you have to keep track of. ",
      language: "C#",
      source: "https://github.com/1etu/alfred",
      website: "",
      icon: "/portfolio/alfred/icon.png",
      images: [],
      video: "",
      paragraphs: [
        "A local-first Windows application for payments, subscriptions, plans, tasks, notes, and kanban boards.",
        "Data stays in a local SQLite database. The application uses C# and .NET.",
      ],
    },
    {
      id: "rest",
      title: "rest",
      description:
        "A 277 kb tray app that reminds you to rest your eyes - and knows when not to interrupt.",
      language: "C++",
      source: "https://github.com/1etu/rest",
      website: "",
      icon: "/portfolio/rest/icon.png",
      images: [
        {
          src: "/portfolio/rest/overlay.png",
          title: "Break reminder",
        },
        {
          src: "/portfolio/rest/settings.png",
          title: "Settings",
        },
      ],
      video: "",
      paragraphs: [
        "A small Windows tray application that schedules screen breaks.",
        "It can defer reminders during calls, fullscreen applications, and presentations. Time away from the keyboard resets the break schedule.",
      ],
    },
    {
      id: "toorker",
      title: "toorker",
      description: "Developer toolkit — built by developers, for developers.",
      language: "TypeScript",
      source: "https://github.com/1etu/toorker",
      website: "",
      icon: "/portfolio/toorker/icon.svg",
      images: [
        {
          src: "/portfolio/toorker/preview.png",
          title: "toorker",
        },
      ],
      video: "",
      paragraphs: [
        "A desktop toolkit with system utilities, converters, and development tools in one interface.",
        "It includes a ports monitor, process manager, and API tester. The application uses Tauri, React, TypeScript, and Rust.",
      ],
    },
    {
      id: "easyupoo",
      title: "easyupoo",
      description: "Google extension to make Yupoo searching easier.",
      language: "JavaScript",
      source: "https://github.com/1etu/easyupoo",
      website: "",
      icon: "/portfolio/easyupoo/icon.svg",
      images: [
        {
          src: "/portfolio/easyupoo/preview.png",
          title: "easyupoo",
        },
      ],
      video: "",
      paragraphs: [
        "A Chrome extension that makes Yupoo product searches easier.",
        "The repository includes installation instructions and examples of the extension on seller pages.",
      ],
    },
    {
      id: "cohesi",
      title: "cohesi",
      description: "Find a way through traffic in Assetto Corsa.",
      language: "Python",
      source: "https://github.com/1etu/cohesi",
      website: "",
      icon: "/portfolio/cohesi/icon.svg",
      images: [],
      video: "",
      paragraphs: [
        "cohesi helps you weave through traffic in Assetto Corsa. It tracks nearby cars and finds a route through the gaps.",
        "A Python service plans the route. Lua scripts use the Custom Shaders Patch API to draw it in the game.",
      ],
    },
    {
      id: "osp-tools",
      title: "osp-tools",
      description: "python tools for managing openswim mp3 players.",
      language: "Python",
      source: "https://github.com/1etu/osp-tools",
      website: "",
      icon: "/portfolio/osp-tools/icon.svg",
      images: [
        {
          src: "/portfolio/osp-tools/preview.png",
          title: "osp-tools",
        },
      ],
      video: "",
      paragraphs: [
        "Python tools for managing OpenSwim MP3 players.",
        "The command-line interface supports device detection, library operations, audio downloads, and batch processing across Windows, macOS, and Linux.",
      ],
    },
    {
      id: "easyupoo-seed",
      title: "easyupoo-seed",
      description: "Blazingly fast product cacher for easYupoo Google Extension.",
      language: "JavaScript",
      source: "https://github.com/1etu/easyupoo-seed",
      website: "",
      icon: "/portfolio/easyupoo-seed/icon.svg",
      images: [],
      video: "",
      paragraphs: [
        "A companion tool that prepares product-price caches for easYupoo.",
        "It scans seller albums and saves a cache file that the extension can import.",
      ],
    },
  ],
} as const;
