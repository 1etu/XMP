import { appUrl } from "../runtime/path.js";
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

export function Xmb({ shell }: { shell: XmbShell }): React.JSX.Element {
  const snap = useSyncExternalStore(shell.subscribe, shell.snapshot, () => EMPTY);
  const content = useSyncExternalStore(shell.subscribe, shell.content.snapshot);
  const described = shell.describe();
  const rootRef = useRef<HTMLElement>(null);
  const focusId = described.items.find((item) => item.focused)?.id;
  useEffect(() => {
    if (
      content.pages.length === 0 &&
      rootRef.current?.contains(document.activeElement)
    ) {
      rootRef.current
        .querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(focusId ?? "")}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [focusId, content.pages.length]);

  return (
    <nav
      ref={rootRef}
      className="xmb"
      aria-label="Portfolio"
      inert={content.pages.length > 0}
      data-depth={described.depth}
    >
      {snap.categories.map((c) => (
        <button
          key={c.id}
          className="xmb-icon"
          type="button"
          aria-label={
            described.categories.find((category) => category.id === c.id)?.title
          }
          aria-current={
            described.categories.find((category) => category.id === c.id)?.focused
              ? "true"
              : undefined
          }
          onClick={() => {
            shell.selectCategory(c.id);
          }}
          onFocus={() => {
            shell.selectCategory(c.id);
          }}
          style={{
            left: x(c.x),
            top: pc(c.y, LOGICAL_H),
            width: size(c.size),
            height: size(c.size),
            opacity: c.alpha,
          }}
        >
          <Material shell={shell} id={c.id} icon={c.icon} />
        </button>
      ))}

      {snap.categoryLabels.map((label) => (
        <span
          key={label.id}
          className="xmb-cat-label"
          aria-hidden="true"
          style={{
            left: x(label.x),
            top: pc(label.y, LOGICAL_H),
            opacity: label.alpha,
          }}
        >
          {label.text}
        </span>
      ))}

      {snap.items.map((i) => (
        <button
          key={i.id}
          className="xmb-icon"
          data-icon-entry={i.id}
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          disabled={i.id.startsWith("outgoing-") || i.id.startsWith("parent-")}
          onClick={() => {
            shell.selectItem(i.id);
          }}
          style={{
            left: x(i.x),
            top: pc(i.y, LOGICAL_H),
            width: size(
              i.size *
                (i.icon >= 100 && i.icon < 120 && i.icon !== 106 ? PICTURE_SCALE : 1),
            ),
            height: size(
              i.size *
                (i.icon >= 100 && i.icon < 120 && i.icon !== 106 ? PICTURE_SCALE : 1),
            ),
            opacity: i.alpha,
          }}
        >
          {i.icon > 0 ? <Material shell={shell} id={i.id} icon={i.icon} /> : null}
        </button>
      ))}

      {snap.labels.map((l) => {
        const href =
          projectOf(l.id) !== undefined
            ? `/work/${l.id}`
            : l.id === "profile" || l.id === "about"
              ? "/user"
              : undefined;
        const Tag = href === undefined ? "button" : "a";
        return (
          <Tag
            key={l.id}
            href={href === undefined ? undefined : appUrl(href)}
            data-shell-link="true"
            data-entry-id={l.id}
            className={l.focused ? "xmb-label xmb-label-on" : "xmb-label"}
            type="button"
            aria-label={l.text}
            aria-current={l.focused ? "true" : undefined}
            aria-hidden={l.id.startsWith("outgoing-") ? "true" : undefined}
            disabled={l.id.startsWith("outgoing-")}
            tabIndex={l.id.startsWith("outgoing-") ? -1 : 0}
            onFocus={() => {
              shell.selectItem(l.id);
            }}
            onClick={(event) => {
              if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                return;
              event.preventDefault();
              shell.selectItem(l.id, true);
            }}
            style={{
              left: x(l.x),
              top: pc(l.y, LOGICAL_H),
              opacity: l.alpha,
              fontSize: size(l.scale * 32),
            }}
          >
            <span className="xmb-label-text">{l.text}</span>
            {l.info === "" ? null : <em className="xmb-info">{l.info}</em>}
          </Tag>
        );
      })}
      {described.depth === 0 ? null : (
        <button
          className="xmb-back-arrow"
          aria-label="Back to Settings"
          onClick={() => {
            shell.command("cancel");
          }}
          style={{ left: x(450), top: pc(507, LOGICAL_H), opacity: shell.depth }}
        >
          ◀
        </button>
      )}
      {described.depth === 0
        ? null
        : snap.labels
            .filter((label) => label.id in SETTING_LABELS)
            .map((label) => (
              <span
                key={`value-${label.id}`}
                className="xmb-setting-value"
                style={{
                  left: "73.5%",
                  top: pc(label.y, LOGICAL_H),
                  opacity: label.alpha,
                }}
              >
                {preferenceLabel(content.preferences, label.id as ChoiceSetting)}
              </span>
            ))}
    </nav>
  );
}
