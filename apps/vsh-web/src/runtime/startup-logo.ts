import { design, measured, verified } from "@vsh/qgl";
import { appUrl } from "./path.js";

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
  const response = await fetch(appUrl("/portfolio/branding/startup-etu.png"), {
    signal,
  });
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

export class StartupLogo {
  private readonly context: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private offsets = new Uint32Array(0);
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private main = new Float32Array(0);
  private blur = new Float32Array(0);
  private footer = new Float32Array(0);
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("Startup logo canvas is unavailable");
    this.context = context;
    this.image = context.createImageData(WIDTH, HEIGHT);
  }

  async load(signal: AbortSignal): Promise<void> {
    const [main, blur, footer] = await logoTextures(signal);
    signal.throwIfAborted();
    if (this.disposed) return;
    let count = 0;
    for (let p = 3; p < main.length; p += 4) {
      if (main[p] || blur[p] || footer[p]) count += 1;
    }
    this.offsets = new Uint32Array(count);
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.main = new Float32Array(count);
    this.blur = new Float32Array(count);
    this.footer = new Float32Array(count);
    let index = 0;
    for (let p = 3; p < main.length; p += 4) {
      if (!main[p] && !blur[p] && !footer[p]) continue;
      const pixel = (p - 3) / 4;
      this.offsets[index] = p;
      this.x[index] = WORLD_WIDTH * (((pixel % WIDTH) + 0.5) / WIDTH - 0.5);
      this.y[index] = WORLD_HEIGHT * (0.5 - (Math.floor(pixel / WIDTH) + 0.5) / HEIGHT);
      this.main[index] = ((main[p] ?? 0) / 255) ** 2;
      this.blur[index] = (blur[p] ?? 0) / 255;
      this.footer[index] = (footer[p] ?? 0) / 255;
      this.image.data[p - 3] = 255;
      this.image.data[p - 2] = 255;
      this.image.data[p - 1] = 255;
      index += 1;
    }
  }

  draw(frame: LogoFrame): void {
    if (this.disposed || this.offsets.length === 0) return;
    const { light, fade, blur, footer } = frame;
    const remaining = 1 - fade;
    const lightX = LIGHT_START_X * (1 - light) + LIGHT_EXIT_X * fade;
    const lightY = LIGHT_START_Y + LIGHT_EXIT_Y * fade;
    const a0 = ATTENUATION_LIT * light * remaining;
    const a1 =
      ATTENUATION_START[1] -
      (ATTENUATION_START[1] - ATTENUATION_LIT) * light +
      (ATTENUATION_START[1] - ATTENUATION_LIT) * fade;
    const a2 =
      ATTENUATION_START[2] -
      (ATTENUATION_START[2] - ATTENUATION_LIT) * light +
      (ATTENUATION_START[2] - ATTENUATION_LIT) * fade;
    const gain = MATERIAL_GAIN * light * remaining;
    for (let i = 0; i < this.offsets.length; i += 1) {
      const distance = Math.hypot((this.x[i] ?? 0) - lightX, (this.y[i] ?? 0) - lightY);
      const illumination = Math.min(
        1,
        gain / (a0 + a1 * distance + a2 * distance * distance),
      );
      const alpha = (this.main[i] ?? 0) * remaining * illumination;
      const clear =
        (1 - alpha) *
        (1 - (this.blur[i] ?? 0) * blur) *
        (1 - (this.footer[i] ?? 0) * footer);
      this.image.data[this.offsets[i] ?? 0] = Math.round(255 * (1 - clear));
    }
    this.context.putImageData(this.image, 0, 0);
  }

  dispose(): void {
    this.disposed = true;
    this.offsets = new Uint32Array(0);
    this.x = new Float32Array(0);
    this.y = new Float32Array(0);
    this.main = new Float32Array(0);
    this.blur = new Float32Array(0);
    this.footer = new Float32Array(0);
    this.context.clearRect(0, 0, WIDTH, HEIGHT);
  }
}
