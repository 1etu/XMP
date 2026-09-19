# Research and credits

XMP is a web implementation built from research into the PS3 XrossMediaBar. It is not Sony source code or a console emulator.

## Interface

| Source                                                                                                           | Role                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Sony PS3 user guide](https://manuals.playstation.net/document/en/ps3/3_10/basicoperations/xmb.html)             | Navigation, menu behavior, and system features                |
| [Sony Theme Settings guide](https://manuals.playstation.net/document/en/ps3/current/settings/themesettings.html) | Theme, background, and font options                           |
| [PS3 Developer Wiki](https://www.psdevwiki.com/ps3/)                                                             | VSH modules, RCO resources, QRC archives, and graphics data   |
| [RPCS3](https://github.com/RPCS3/rpcs3)                                                                          | RSX shader tools used to interpret the graphics instructions  |
| [Lineschive](https://connie.nekoweb.org/lineschive/)                                                             | Research into Sony's animated backgrounds                     |
| [linkev / PlayStation-3-XMB](https://github.com/linkev/PlayStation-3-XMB)                                        | Earlier community work on the XMB wave                        |
| [TheZim1985: firmware 3.00](https://www.youtube.com/watch?v=b5meKdtARNw)                                         | Visual reference for layout, focus, materials, and What's New |
| [Startup comparison](https://www.youtube.com/watch?v=M7zXD3w1b0U)                                                | Reference for the startup sequence and transitions            |

Local research also used PS3 firmware 3.00 and 4.93 resources. It informed the material data, wave math, interface measurements, and timing tables. The published site does not contain firmware executables.

Source measurements and browser adaptations are different things. Browser input, portfolio content, visitor counts, responsive layouts, and web navigation are project behavior. Where measurements were incomplete, the implementation uses explicit design values. These sources do not prove that every frame matches original hardware.

## Campaign

The main visual reference is [Sterling P. Sanders's Sony launch portfolio](https://sterlingsanders.com/sony-ps3-launch-play-beyond). His page dates the work to 2003–2006. It includes the White Room print ads and the outdoor Play Beyond campaign.

The White Room prints place one strange physical object in a sparse room, with a small caption and product at the right. The outdoor work gives the image most of the space and uses thin, widely spaced lettering.

XMP adapts those compositions into **Browse B3yond**. A keyboard key becomes the wave. A folder holds a world. A browser becomes the product. The caption stays small. The artwork follows the reference lettering as raster artwork, without a bundled commercial font file.

The separate [2009 campaign announcement](https://blog.playstation.com/2009/08/27/it-only-does-everything/) documents _It Only Does Everything_. Its feature-led humor informed the launch copy. It is not the source of the White Room layout. No claim about viral reach is part of this campaign.

Generated campaign images use OpenAI's image tool with the supplied references. The [prompts](marketing/source/prompts.md) record the direction. The GIFs and videos are actual recordings of XMP, with no generated interface frames.

The original Sony advertisements remain reference material. They are linked here, not included as XMP campaign assets.

## Software and artwork

- [TypeScript](https://www.typescriptlang.org/), [React](https://react.dev/), and [Vite](https://vite.dev/): application code and build tools.
- [WebGPU](https://www.w3.org/TR/webgpu/), [WebGL](https://www.khronos.org/webgl/), and [Web Audio](https://www.w3.org/TR/webaudio/): browser graphics and sound.
- [pnpm](https://pnpm.io/) and [Node.js](https://nodejs.org/): workspace and local server.
- [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/): automated checks and browser capture.
- [etu](https://github.com/1etu): portfolio code, content, and project artwork.
- Sony Computer Entertainment: original XMB design and the Sony-origin icons listed in [third-party notices](THIRD_PARTY_NOTICES.md).

The asset source lists remain in `resources/portfolio/sources.json` and `resources/credits/sources.json` in the source checkout.

## README references

[sony/gobreaker](https://github.com/sony/gobreaker) and [sony/sonyflake](https://github.com/sony/sonyflake) informed the README structure: definition first, then use, implementation, and license. Their wording and code were not copied.
