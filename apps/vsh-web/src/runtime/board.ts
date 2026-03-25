import { boardChannels, boardItems } from "@vsh/content";
import type { BoardChannel, BoardItem } from "@vsh/content";
import { verified } from "@vsh/qgl";

export const BOARD_EXPAND_MS = verified((8 * 1000) / 60);
export const BOARD_SCROLL_SPEED = verified(120);
export const BOARD_TITLE_DELAY_MS = verified(1000);