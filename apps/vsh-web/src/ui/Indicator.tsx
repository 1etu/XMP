import { useEffect, useState, useSyncExternalStore } from "react";

import { SysRtc } from "@vsh/librtc";
import type { Rtc } from "@vsh/librtc";
import { SystemClock } from "@vsh/system-plugin";
import { profile } from "@vsh/content";
import { watchPresence } from "../runtime/presence.js";

export function Indicator({ rtc }: { rtc?: Rtc }): React.JSX.Element {
  const [clock] = useState(() => new SystemClock(rtc ?? new SysRtc()));
  const now = useSyncExternalStore(clock.subscribe, clock.snapshot, clock.snapshot);
  const [visitors, setVisitors] = useState<number | undefined>(undefined);

  useEffect(() => watchPresence(setVisitors), []);
  useEffect(() => () => { clock.dispose(); }, [clock]);

  return (
    <div className="xmb-indicator">
      <div className="xmb-indicator-identity">
        <img
          className="xmb-indicator-plus"
          src={
            import.meta.env.DEV ? "/original/indicator/plus.png" : "/portfolio/plus.svg"
          }
          alt=""
        />
        <img
          className="xmb-indicator-avatar"
          src={profile.avatar}
          alt={profile.handle}
        />
        <span
          className="xmb-indicator-visitors"
          role="img"
          aria-label={
            visitors === undefined
              ? "Live visitor count unavailable"
              : `${visitors} ${visitors === 1 ? "visitor" : "visitors"} here now`
          }
        >
          <img
            src={
              import.meta.env.DEV
                ? "/original/indicator/friend.png"
                : "/portfolio/friend.svg"
            }
            alt=""
          />
          <span aria-hidden="true">{visitors ?? "—"}</span>
        </span>
      </div>
      <time>
        {now.date}
        <span className="xmb-clock-gap" />
        {now.time}
      </time>
      <svg className="xmb-clock" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" />
        <path d="M7 13l10 3 4-9" />
      </svg>
    </div>
  );
}
