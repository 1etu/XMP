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
