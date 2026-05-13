import { design, shadeIcon, verified } from "@vsh/qgl";
import type { IconTextures } from "@vsh/qgl";
import type {
  IconShadeJob,
  IconDraw,
  IconWorkerInput,
  IconWorkerOutput,
} from "./icon-material-job.js";

const CROP_SIZE = verified(128);
const CACHE_BASES = design(4);
let textures: IconTextures | undefined;
const bases = new Map<
  string,
  readonly { readonly id: string; readonly blob: Blob }[]
>();
