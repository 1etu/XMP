import { appUrl } from "../runtime/path.js";
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

export function InformationBoard({
  board,
  subscribe,
  onCommand,
  onClose,
  onNavigate,
}: BoardProps): React.JSX.Element {
  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => board.subscribe(listener), [board]),
    useCallback(() => board.snapshot, [board]),
  );
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const refresh = useRef<() => void>(() => undefined);
  const touchY = useRef<number | undefined>(undefined);
  const current = board.current;
  const mode = snapshot.mode;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const focused = document.activeElement;
    if (
      root === null ||
      focused === null ||
      !root.contains(focused) ||
      focused.getAttribute("role") !== "option"
    )
      return;
    root
      .querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
      ?.focus({ preventScroll: true });
  }, [snapshot.selected, snapshot.channelSelected, mode]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const update = (): void => {
      const frame = board.frame;
      root.style.setProperty("--board-expansion", String(frame.expansion));
      root.style.setProperty("--board-list-y", String(frame.listY));
      root.style.setProperty("--board-title-x", String(frame.titleX));
      root.style.setProperty("--board-article-y", String(frame.articleY));
    };
    const measure = (): void => {
      scaleRef.current = Number.parseFloat(getComputedStyle(root).fontSize) / 28;
      for (const title of root.querySelectorAll<HTMLElement>("[data-board-title]")) {
        const id = title.dataset["boardTitle"];
        if (id !== undefined)
          board.measureTitle(id, title.scrollWidth / scaleRef.current);
      }
      if (articleRef.current !== null)
        board.measureArticle(articleRef.current.scrollHeight / scaleRef.current);
      update();
    };
    refresh.current = update;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    if (articleRef.current !== null) observer.observe(articleRef.current);
    const unsubscribe = subscribe(update);
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) measure();
    });
    measure();
    return () => {
      active = false;
      observer.disconnect();
      unsubscribe();
      refresh.current = () => undefined;
    };
  }, [board, subscribe, snapshot.items, mode, snapshot.selected]);

  const command = (value: BoardCommand): void => {
    onCommand(value);
    refresh.current();
  };
  const select = (index: number): void => {
    board.select(index);
    onCommand("right");
    refresh.current();
  };
  const scroll = (delta: number): void => {
    if (mode === "article") board.scrollArticle(delta / scaleRef.current);
    else if (delta !== 0) command(delta > 0 ? "down" : "up");
    refresh.current();
  };

  return (
    <section
      ref={rootRef}
      className="vsh-board"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vsh-board-title"
      data-mode={mode}
      data-native-input="true"
      onWheel={(event) => {
        scroll(
          event.deltaY *
            (event.deltaMode === 1
              ? 32
              : event.deltaMode === 2
                ? 394 * scaleRef.current
                : 1),
        );
      }}
      onTouchStart={(event) => {
        touchY.current = event.touches[0]?.clientY;
      }}
      onTouchMove={(event) => {
        const next = event.touches[0]?.clientY;
        if (next === undefined || touchY.current === undefined) return;
        scroll(touchY.current - next);
        touchY.current = next;
      }}
      onTouchEnd={() => {
        touchY.current = undefined;
      }}
      onTouchCancel={() => {
        touchY.current = undefined;
      }}
    >
      <div className="vsh-board-frame">
        <header className="vsh-board-header">
          <BoardMark />
          <h1
            id="vsh-board-title"
            className="vsh-board-sr"
            tabIndex={-1}
            data-focus-default
          >
            Information Board
          </h1>
        </header>
        {mode !== "article" && mode !== "channels" ? (
          <>
            <button
              className="vsh-board-arrow vsh-board-up"
              type="button"
              aria-label="Previous headline"
              onClick={() => {
                command("up");
              }}
              disabled={snapshot.selected === 0}
            >
              ▲
            </button>
            <div
              className="vsh-board-list-mask"
              role="listbox"
              aria-label="Headlines"
              aria-activedescendant={`board-item-${current?.id ?? "empty"}`}
            >
              <div ref={listRef} className="vsh-board-list">
                {snapshot.items.map((item, index) => (
                  <button
                    key={item.id}
                    id={`board-item-${item.id}`}
                    className="vsh-board-row"
                    type="button"
                    role="option"
                    aria-selected={snapshot.selected === index}
                    onClick={() => {
                      select(index);
                    }}
                    onFocus={() => {
                      board.select(index);
                      refresh.current();
                    }}
                  >
                    <img src={appUrl(item.image)} alt="" draggable={false} />
                    <span className="vsh-board-row-title">
                      <span data-board-title={item.id}>{item.title}</span>
                    </span>
                    <time dateTime={item.date}>{item.date.replaceAll("-", ".")}</time>
                    <span className="vsh-board-row-next" aria-hidden="true">
                      ▶
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              className="vsh-board-arrow vsh-board-down"
              type="button"
              aria-label="Next headline"
              onClick={() => {
                command("down");
              }}
              disabled={snapshot.selected >= snapshot.items.length - 1}
            >
              ▼
            </button>
            <button
              className="vsh-board-channel-control"
              type="button"
              aria-label="Change news channel"
              onClick={() => {
                command("options");
              }}
            >
              <span aria-hidden="true">△ :</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M21 2a7 7 0 0 1-8 9L5 20a3 3 0 0 1-4-4l9-8a7 7 0 0 1 9-8l-5 5 3 3z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </>
        ) : null}
        {mode === "article" && current !== undefined ? (
          <>
            <div className="vsh-board-article-heading">
              <img src={appUrl(current.image)} alt="" />
              <h2>{current.title}</h2>
              <time dateTime={current.date}>{current.date.replaceAll("-", ".")}</time>
            </div>
            <div className="vsh-board-article-mask">
              <div ref={articleRef} className="vsh-board-article-copy">
                {current.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <button
              className="vsh-board-arrow vsh-board-back"
              type="button"
              aria-label="Return to headlines"
              onClick={() => {
                command("left");
              }}
            >
              ◀
            </button>
            {current.href !== undefined ? (
              <button
                className="vsh-board-arrow vsh-board-link"
                type="button"
                aria-label="Open article website"
                onClick={() => {
                  if (current.href !== undefined) onNavigate(current.href);
                }}
              >
                ▶
              </button>
            ) : null}
          </>
        ) : null}
        {mode === "channels" ? (
          <>
            <p className="vsh-board-channel-heading">Choose a channel</p>
            <div
              className="vsh-board-channels"
              role="listbox"
              aria-label="News channels"
            >
              {boardChannels.map((channel, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={snapshot.channelSelected === index}
                  key={channel.id}
                  onFocus={() => {
                    board.select(index);
                    refresh.current();
                  }}
                  onClick={() => {
                    select(index);
                  }}
                >
                  <span>{channel.title}</span>
                  <span aria-hidden="true">▶</span>
                </button>
              ))}
            </div>
            <button
              className="vsh-board-arrow vsh-board-back"
              type="button"
              aria-label="Return to headlines"
              onClick={() => {
                command("left");
              }}
            >
              ◀
            </button>
          </>
        ) : null}
      </div>
      <button className="vsh-board-close" type="button" onClick={onClose}>
        Close
      </button>
    </section>
  );
}

export function BoardTicker({
  board,
  subscribe,
  onOpen,
}: {
  readonly board: Board;
  readonly subscribe: BoardProps["subscribe"];
  readonly onOpen: () => void;
}): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => board.subscribe(listener), [board]),
    useCallback(() => board.snapshot, [board]),
  );
  const rootRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const headline = board.headline;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    if (root === null || text === null || headline === undefined) return;
    const measure = (): void => {
      const scale = Number.parseFloat(getComputedStyle(text).fontSize) / 28;
      board.measureTitle(headline.id, text.scrollWidth / scale);
    };
    const update = (): void => {
      root.style.setProperty("--board-ticker-x", String(board.frame.tickerX));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    update();
    const unsubscribe = subscribe(update);
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [board, subscribe, headline, snapshot.enabled, snapshot.mode]);

  if (!snapshot.enabled || snapshot.mode !== "ticker" || headline === undefined)
    return null;
  return (
    <button
      ref={rootRef}
      className="vsh-board-ticker"
      type="button"
      onClick={onOpen}
      aria-label={`Information Board: ${headline.title}`}
    >
      <BoardMark />
      <span className="vsh-board-ticker-mask">
        <span ref={textRef}>{headline.title}</span>
      </span>
    </button>
  );
}
