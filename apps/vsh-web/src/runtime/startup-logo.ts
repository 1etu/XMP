import { design, measured, verified } from "@vsh/qgl";

const WIDTH = verified(700);
const HEIGHT = verified(350);
const WORLD_WIDTH = verified(2.56);
const WORLD_HEIGHT = verified(1.28);
const MATERIAL_GAIN = measured(0.262);
const LIGHT_START_X = verified(-3);
const LIGHT_START_Y = verified(0.5);
const LIGHT_EXIT_X = verified(2.25);
const LIGHT_EXIT_Y = verified(1.5);
const ATTENUATION_START = [verified(0), verified(1), verified(4)] as const;
const ATTENUATION_LIT = verified(0.1);
const FOOTER_START = measured(222);
const BLACK_LEVEL = design(8);
const BLUR_RADIUS = design(3);

interface LogoFrame {
  readonly light: number;
  readonly fade: number;
  readonly blur: number;
  readonly footer: number;
}

async function logoTextures(
  signal: AbortSignal,
): Promise<readonly [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray]> {
  const response = await fetch("/portfolio/branding/startup-etu.png", { signal });
  if (!response.ok) throw new Error("Startup logo is unavailable");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    signal.throwIfAborted();
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) throw new Error("Startup texture canvas is unavailable");
    context.drawImage(bitmap, 0, 0, WIDTH, HEIGHT);
    const source = context.getImageData(0, 0, WIDTH, HEIGHT).data;
    const main = context.createImageData(WIDTH, HEIGHT);
    const footer = context.createImageData(WIDTH, HEIGHT);
    for (let p = 0; p < source.length; p += 4) {
      const luminance = Math.max(
        source[p] ?? 0,
        source[p + 1] ?? 0,
        source[p + 2] ?? 0,
      );
      const alpha = Math.max(0, (luminance - BLACK_LEVEL) / (255 - BLACK_LEVEL));
      const layer = p / 4 < WIDTH * FOOTER_START ? main : footer;
      layer.data[p] = 255;
      layer.data[p + 1] = 255;
      layer.data[p + 2] = 255;
      layer.data[p + 3] = Math.round(alpha * (source[p + 3] ?? 0));
    }
    context.putImageData(main, 0, 0);
    const blurred = document.createElement("canvas");
    blurred.width = WIDTH;
    blurred.height = HEIGHT;
    const blurContext = blurred.getContext("2d", { willReadFrequently: true });
    if (blurContext === null) throw new Error("Startup blur canvas is unavailable");
    blurContext.filter = `blur(${String(BLUR_RADIUS)}px)`;
    blurContext.drawImage(canvas, 0, 0);
    return [main.data, blurContext.getImageData(0, 0, WIDTH, HEIGHT).data, footer.data];
  } finally {
    bitmap.close();
  }
}
