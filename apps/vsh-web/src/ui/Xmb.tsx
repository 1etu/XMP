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
function pc(v: number, of: number): string {
  return `${String((v / of) * 100)}%`;
}

function x(v: number): string {
  return `calc(var(--xmb-axis) + ${String(v - LOGICAL_W * 0.29453125)} * var(--xmb-unit))`;
}

function size(v: number): string {
  return `calc(${String(v)} * var(--xmb-unit))`;
}

function Material({
  shell,
  id,
  icon,
}: {
  shell: XmbShell;
  id: string;
  icon: number;
}): React.JSX.Element {
  const { current, previous, blend } = shell.iconMaterial(id, icon);
  const url = current ?? fallbackIcon(icon);
  const changing = previous !== undefined && previous !== url && blend < 1;
  return (
    <>
      {changing ? (
        <span
          className="xmb-material-layer"
          style={{
            backgroundImage: `url(${JSON.stringify(previous)})`,
            opacity: 1 - blend,
          }}
        />
      ) : null}
      <span
        className="xmb-material-layer"
        style={{
          backgroundImage: `url(${JSON.stringify(url)})`,
          opacity: changing ? blend : 1,
        }}
      />
    </>
  );
}
