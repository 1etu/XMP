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
