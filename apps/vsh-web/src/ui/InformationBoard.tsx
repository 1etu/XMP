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

function BoardMark(): React.JSX.Element {
  return (
    <svg
      className="vsh-board-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M1 2h12v12H1zM23 2l7 12H16zM1 19l12 12M13 19 1 31" />
      <circle cx="23" cy="25" r="6" />
    </svg>
  );
}
