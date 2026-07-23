import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { boardChannels } from "@vsh/content";
import type { Board, BoardCommand } from "../runtime/board.js";
import "./information-board.css";

interface BoardProps {
  readonly board: Board;
  readonly subscribe: (listener: () => void) => () => void;
  readonly onCommand: (command: BoardCommand) => void;
  readonly onClose: () => void;
  readonly onNavigate: (href: string) => void;
}
