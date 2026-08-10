import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, SubmitEvent } from "react";
import { profile, projects } from "@vsh/content";
import { BROWSER_HOME } from "../runtime/browser.js";
import type { WebBrowser } from "../runtime/browser.js";
import { ControlGlyph } from "./ControlGlyph.js";
import "./webview.css";

const ICON_PATHS: Readonly<Record<string, string>> = {
  view: "M5 5h22v22H5z M10 22l6-15 6 15m-10-5h8",
  tool: "M4 11h24v17H4z M11 11V6h10v5 M4 17h24",
  tab: "M3 5h8v8H3z M13 5h8v8h-8z M23 5h6v8h-6z M8 18h8v8H8z M20 18h8v8h-8z",
  search: "M21 21l8 8 M24 13A10 10 0 1 1 4 13a10 10 0 0 1 20 0",
  file: "M6 3h21v26H6z M10 9h2m3 0h8m-13 7h2m3 0h8m-13 7h2m3 0h8",
  back: "M29 16H5m9-9-9 9 9 9",
  forward: "M3 16h24m-9-9 9 9-9 9",
  reload: "M26 10A12 12 0 1 0 27 22 M26 3v9h-9",
  home: "M3 15 16 3l13 12M7 12v17h18V12M13 29v-9h6v9",
  bookmark: "M16 29C-3 17 0 3 10 5l6 6 6-6c10-2 13 12-6 24z",
  history: "M16 29A13 13 0 1 0 3 16 M16 7v10l-7 4 M3 8v8h8",
  quit: "M27 6 5 28 M29 17A13 13 0 1 1 16 3",
  topbaricon:
    "M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26 M3 16h26M16 3c-8 8-8 18 0 26m0-26c8 8 8 18 0 26M5 9h22M5 23h22",
};
