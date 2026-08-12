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
