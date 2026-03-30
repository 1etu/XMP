import { boardChannels, boardItems } from "@vsh/content";
import type { BoardChannel, BoardItem } from "@vsh/content";
import { verified } from "@vsh/qgl";

export const BOARD_EXPAND_MS = verified((8 * 1000) / 60);
export const BOARD_SCROLL_SPEED = verified(120);
export const BOARD_TITLE_DELAY_MS = verified(1000);
export const BOARD_ARTICLE_DELAY_MS = verified(3000);
export const BOARD_ARTICLE_SPEED = verified(60);
export const BOARD_ROW_HEIGHT = verified(64);
export const BOARD_DISPLAY_KEY = "vsh.information-board.display";
const TICKER_GAP = verified(11);
const VISIBLE_ROWS = verified(8);
const TITLE_WIDTH = verified(326);
