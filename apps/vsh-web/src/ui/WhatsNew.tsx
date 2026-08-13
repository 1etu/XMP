import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { WHATS_NEW } from "../runtime/whats-new.js";
import type { XmbShell } from "../runtime/shell.js";
import "./whats-new.css";

export function WhatsNewPreview({ shell }: { shell: XmbShell }): React.JSX.Element {
  const snapshot = useSyncExternalStore(
    shell.whatsNew.subscribe,
    shell.whatsNew.snapshot,
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      shell.whatsNew.onFrame(() => {
        ref.current?.style.setProperty(
          "--wn-preview-turn",
          `${shell.whatsNew.frame.previewTurn}deg`,
        );
      }),
    [shell],
  );
  return (
    <div className="wn-preview" aria-hidden="true" ref={ref}>
      {snapshot.items.slice(0, 3).map((item, index) => (
        <div
          className="wn-preview-card"
          key={item.id}
          style={{ "--wn-preview-index": index } as CSSProperties}
        >
          {snapshot.states[index] === "ready" ? <img src={item.image} alt="" /> : null}
        </div>
      ))}
    </div>
  );
}

function ActionBadge({
  type,
}: {
  type: "web" | "video" | "project";
}): React.JSX.Element {
  return (
    <span className="wn-action" data-type={type} aria-hidden="true">
      <svg viewBox="0 0 84 49">
        <path d="M9 22h13v-7l12 10-12 10v-7H9Z" fill="currentColor" />
        {type === "video" ? (
          <path d="M43 12h30v26H43Zm6 0v26m18-26v26M43 19h6m-6 12h6m18-12h6m-6 12h6" />
        ) : type === "web" ? (
          <>
            <circle cx="59" cy="25" r="15" />
            <path d="M44 25h30M59 10c-13 12-13 18 0 30 13-12 13-18 0-30Z" />
          </>
        ) : (
          <path d="M45 12h17l10 10v16H45Zm17 0v10h10M51 28h15m-15 5h15" />
        )}
      </svg>
    </span>
  );
}

export function WhatsNew({ shell }: { shell: XmbShell }): React.JSX.Element {
  const model = shell.whatsNew;
  const snapshot = useSyncExternalStore(model.subscribe, model.snapshot);
  const root = useRef<HTMLElement>(null);
  const selected = snapshot.items[snapshot.selected];
  useEffect(() => {
    const update = (): void => {
      const element = root.current;
      if (element === null) return;
      const frame = model.frame;
      element.style.setProperty("--wn-row", String(frame.row));
      element.style.setProperty("--wn-turn", `${frame.rotation}deg`);
      element.style.setProperty("--wn-title-x", `${frame.titleX}`);
      for (const card of element.querySelectorAll<HTMLElement>("[data-card-index]")) {
        const values = model.cardFrame(Number(card.dataset["cardIndex"]));
        card.style.setProperty("--wn-scale", String(values.scale));
        card.style.setProperty("--wn-image-alpha", String(values.opacity));
        card.style.setProperty(
          "--wn-focus",
          String((values.scale - WHATS_NEW.scale) / (1 - WHATS_NEW.scale)),
        );
      }
    };
    update();
    return model.onFrame(update);
  }, [model, shell, snapshot.items]);
  useEffect(() => {
    const caption = root.current?.querySelector<HTMLElement>(
      ".wn-card[aria-selected=true] .wn-caption-text",
    );
    if (caption === null || caption === undefined) return;
    const measure = (): void => {
      const card = caption.closest<HTMLElement>(".wn-card");
      const unit = card === null ? 1 : card.offsetWidth / WHATS_NEW.captionWidth;
      model.measureTitle(caption.scrollWidth / unit);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(caption);
    return () => {
      observer.disconnect();
    };
  }, [model, snapshot.selected]);
  return (
    <section
      className="whats-new"
      ref={root}
      aria-label="What's New"
      data-focus-default
      tabIndex={-1}
      style={{ "--wn-column": snapshot.selected % WHATS_NEW.columns } as CSSProperties}
    >
      <div className="wn-scene">
        <div
          className="wn-group wn-pick"
          style={{ "--wn-group-row": 0 } as CSSProperties}
        >
          <span>Our Pick</span>
        </div>
        {snapshot.items.length > snapshot.recentStart ? (
          <div
            className="wn-group wn-played"
            style={
              {
                "--wn-group-row": snapshot.recentStart / WHATS_NEW.columns,
              } as CSSProperties
            }
          >
            <span>Recently Viewed</span>
          </div>
        ) : null}
        <div
          className="wn-grid"
          role="grid"
          aria-label="What's New items"
          aria-rowcount={Math.ceil(snapshot.items.length / 3)}
          aria-colcount={3}
        >
          {Array.from({ length: Math.ceil(snapshot.items.length / 3) }, (_, row) => (
            <div role="row" key={row}>
              {snapshot.items.slice(row * 3, row * 3 + 3).map((item, column) => {
                const index = row * 3 + column;
                const focused = index === snapshot.selected;
                const state = snapshot.states[index];
                return (
                  <div
                    role="gridcell"
                    aria-selected={focused}
                    key={`${index}-${item.id}`}
                    className="wn-card"
                    data-state={state}
                    data-card-index={index}
                    style={
                      {
                        "--wn-card-row": row,
                        "--wn-card-column": column,
                        zIndex: focused ? 3 : 1,
                      } as CSSProperties
                    }
                  >
                    <button
                      type="button"
                      className="wn-card-button"
                      tabIndex={focused ? 0 : -1}
                      aria-label={
                        state === "failed" ? `Retry ${item.title}` : item.title
                      }
                      aria-busy={state === "loading"}
                      onFocus={() => {
                        model.select(index);
                      }}
                      onClick={() => {
                        model.select(index);
                        shell.command("decide");
                      }}
                    >
                      <span className="wn-card-surface">
                        {state === "ready" ? (
                          <img
                            className="wn-art"
                            src={item.image}
                            data-artwork={item.artwork}
                            alt=""
                            draggable={false}
                          />
                        ) : null}
                        {state === "loading" ? (
                          <span className="wn-spinner" aria-hidden="true" />
                        ) : null}
                        {state === "failed" ? (
                          <span className="wn-timeout">
                            <span>Unable to load image.</span>
                            <span>Enter to retry.</span>
                          </span>
                        ) : null}
                        {state === "ready" && focused ? (
                          <ActionBadge type={item.type} />
                        ) : null}
                      </span>
                      {state === "ready" &&
                      !snapshot.seen.includes(item.id) &&
                      index < snapshot.recentStart ? (
                        <span className="wn-new">NEW</span>
                      ) : null}
                      <span className="wn-caption" aria-hidden="true">
                        <span className="wn-caption-clip">
                          <span className="wn-caption-text">{item.title}</span>
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <button
          className="wn-back"
          aria-label="Back to What's New"
          type="button"
          onClick={() => {
            shell.command("cancel");
          }}
        >
          ◀
        </button>
        <button
          className="wn-scroll wn-up"
          aria-label="Previous row"
          type="button"
          disabled={snapshot.selected < 3}
          onClick={() => {
            shell.command("up");
          }}
        >
          ▲
        </button>
        <button
          className="wn-scroll wn-down"
          aria-label="Next row"
          type="button"
          disabled={snapshot.selected + 3 >= snapshot.items.length}
          onClick={() => {
            shell.command("down");
          }}
        >
          ▼
        </button>
      </div>
      <span className="wn-status" role="status">
        {selected?.title}
        {snapshot.states[snapshot.selected] === "loading" ? ", loading" : ""}
      </span>
      {snapshot.states.some((state) => state === "loading") ? (
        <svg className="wn-busy" viewBox="0 0 32 32" aria-label="Loading items">
          <circle cx="16" cy="16" r="13" />
          <path d="M8 11l8 5 4-9" />
        </svg>
      ) : null}
    </section>
  );
}
