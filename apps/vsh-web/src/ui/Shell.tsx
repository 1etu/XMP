import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { backendIdOf } from "@vsh/qgl";

import { createRuntime } from "../runtime/runtime.js";
import { StartupLogo } from "../runtime/startup-logo.js";
import { Portfolio } from "./Portfolio.js";
import { Indicator } from "./Indicator.js";
import { Xmb } from "./Xmb.js";
import { Startup } from "./Startup.js";
import type { Runtime } from "../runtime/runtime.js";
import type { XmbShell } from "../runtime/shell.js";
import type { Boot, BootSnapshot } from "../runtime/boot.js";
import type { StartupFrame } from "../runtime/startup.js";

const IDLE: BootSnapshot = {
  state: "cold",
  stage: "",
  done: 0,
  total: 0,
  detail: "",
};

function label(snap: BootSnapshot): string {
  if (snap.state === "failed") {
    return `Cannot start the graphics runtime. ${snap.detail}`;
  }
  if (snap.state === "ready") {
    return "Ready.";
  }
  if (snap.state === "starting") {
    return "Starting.";
  }
  if (snap.stage === "") {
    return "Starting.";
  }

  return `Loading ${snap.stage}, step ${String(snap.done + 1)} of ${String(snap.total)}.`;
}

function BootStatus({ boot }: { boot: Boot }): React.JSX.Element {
  const snap = useSyncExternalStore(boot.subscribe, boot.snapshot, () => IDLE);

  return (
    <p className="vsh-status" role="status" aria-live="polite">
      {label(snap)}
    </p>
  );
}

export function Shell(): React.JSX.Element {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLCanvasElement>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [shell, setShell] = useState<XmbShell | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    const pick = backendIdOf(new URLSearchParams(globalThis.location.search).get("gl"));
    const abort = new AbortController();
    const logo =
      logoRef.current !== null ? new StartupLogo(logoRef.current) : undefined;
    if (logo !== undefined) {
      void logo.load(abort.signal).catch(() => {
        logo.dispose();
      });
    }
    const base = {
      canvas,
      onShell: setShell,
      onFocusLight: (light: number): void => {
        surfaceRef.current?.style.setProperty("--xmb-focus-light", String(light));
      },
      onStartup: (frame: StartupFrame): void => {
        const surface = surfaceRef.current;
        if (surface === null) return;
        surface.style.setProperty("--startup-logo", String(frame.logo));
        surface.style.setProperty("--startup-menu", String(frame.menu));
        surface.style.setProperty("--startup-clock", String(frame.clock));
        surface.style.setProperty("--startup-menu-scale", String(frame.menuScale));
        surface.style.setProperty("--startup-menu-blur", String(frame.menuBlur));
        surface.dataset["startup"] = frame.done ? "complete" : "active";
        surface.dataset["startupTime"] = String(frame.elapsedMs);
        logo?.draw(frame);
      },
    };
    const rt = createRuntime(pick === undefined ? base : { ...base, backend: pick });
    setRuntime(rt);
    rt.start();

    return () => {
      rt.dispose();
      abort.abort();
      logo?.dispose();
      setRuntime(null);
      setShell(null);
    };
  }, []);

  return (
    <div ref={surfaceRef} className="vsh-shell" data-startup="loading">
      <canvas ref={canvasRef} className="vsh-canvas" aria-hidden="true" />
      <Startup canvasRef={logoRef} />
      {runtime === null ? null : <BootStatus boot={runtime.boot} />}
      <div className="vsh-menu">
        {shell === null ? null : <Xmb shell={shell} />}
        {shell === null ? null : <Indicator />}
      </div>
      {shell === null ? null : <Portfolio shell={shell} />}
    </div>
  );
}
