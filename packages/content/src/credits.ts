export const siteCredits = [
  {
    title: "TypeScript",
    image: "/credits/typescript.png",
    href: "https://www.typescriptlang.org/",
    text: "The menu runtime, input handling, graphics code, and resource tools use TypeScript. TypeScript is developed by Microsoft and its contributors under the MIT license.",
  },
  {
    title: "React",
    image: "/credits/react.png",
    href: "https://react.dev/",
    text: "React renders the interface and accessible page content. A separate runtime controls navigation and animation. React is developed by Meta and its contributors under the MIT license.",
  },
  {
    title: "WebGL",
    image: "/credits/webgl.png",
    href: "https://www.khronos.org/webgl/",
    text: "The WebGL 2 renderer draws the background, wave, particles, and lighting when WebGPU is unavailable. WebGL and the WebGL logo are trademarks of the Khronos Group.",
  },
  {
    title: "WebGPU and Web Audio",
    href: "https://www.w3.org/TR/webgpu/",
    text: "WebGPU runs the graphics through WGSL shaders. Web Audio plays the interface sounds. Browser gamepad and pointer APIs connect the controls to the same navigation system.",
  },
  {
    title: "Vite, pnpm, and Node.js",
    href: "https://vite.dev/",
    text: "Vite builds the website. pnpm links its packages. A small Node.js server counts connected visitors for the information panel. The server keeps this count in memory.",
  },
  {
    title: "Vitest and Playwright",
    href: "https://playwright.dev/",
    text: "Vitest checks navigation, animation clocks, and graphics calculations. Playwright checks the site in a browser, including page transitions, keyboard controls, and different screen sizes.",
  },
] as const;

export const researchCredits = [
  {
    title: "Sony Computer Entertainment",
    href: "https://manuals.playstation.net/document/en/ps3/3_10/basicoperations/xmb.html",
    text: "The PlayStation 3 XrossMediaBar is the reference for this interface. Sony's user guides document its navigation, information panel, options, and system pages.",
  },
  {
    title: "PS3 Developer Wiki",
    href: "https://www.psdevwiki.com/ps3/",
    text: "Community documentation helped identify VSH modules, RCO interface resources, QRC graphics archives, and the icon material data.",
  },
  {
    title: "RPCS3 contributors",
    href: "https://github.com/RPCS3/rpcs3",
    text: "The open-source RSX shader decompiler helped interpret the original graphics instructions and check the icon lighting calculations.",
  },
  {
    title: "Interface recordings",
    href: "https://www.youtube.com/watch?v=b5meKdtARNw",
    text: "A firmware 3.00 menu recording supplied a visual reference for spacing, focus glow, icon materials, waves, and particles.",
  },
  {
    title: "Startup comparison",
    href: "https://www.youtube.com/watch?v=M7zXD3w1b0U",
    text: "The second panel of this comparison supplied the reference for the startup light sweep, background changes, and menu reveal.",
  },
  {
    title: "Resource research",
    href: "https://www.psdevwiki.com/ps3/Resource_Container_(RCO)",
    text: "Local study of firmware 3.00 and 4.93 informed the wave calculation, menu geometry, profile layout, controls, and credits scroll. Browser rendering and responsive layouts remain adaptations.",
  },
] as const;
