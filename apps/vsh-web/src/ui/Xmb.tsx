import { useEffect, useRef, useSyncExternalStore } from "react";
import { preferenceLabel, projectOf, SETTING_LABELS } from "@vsh/content";
import type { ChoiceSetting } from "@vsh/content";
import { design } from "@vsh/qgl";
import { fallbackIcon } from "./icons.js";

import type { Snapshot } from "@vsh/paf";

import type { XmbShell } from "../runtime/shell.js";

const EMPTY: Snapshot = {
  categories: [],
  categoryLabel: undefined,
  categoryLabels: [],
  items: [],
  labels: [],
};

const LOGICAL_W = 1920;
const LOGICAL_H = 1080;
const PICTURE_SCALE = design(0.56);