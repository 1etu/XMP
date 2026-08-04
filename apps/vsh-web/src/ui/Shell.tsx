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
