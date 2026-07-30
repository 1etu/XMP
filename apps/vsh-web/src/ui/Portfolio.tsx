import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  informationOf,
  optionsFor,
  profile,
  projectOf,
  SETTING_LABELS,
} from "@vsh/content";
import { CHOICES } from "../runtime/presentation.js";
import type { Page } from "../runtime/presentation.js";
import type { XmbShell } from "../runtime/shell.js";
import { ControlGlyph } from "./ControlGlyph.js";
import { About } from "./About.js";
import { SystemInformation } from "./SystemInformation.js";
import { Profile } from "./Profile.js";
import { WebView } from "./WebView.js";
import { InformationBoard, BoardTicker } from "./InformationBoard.js";
import { WhatsNew, WhatsNewPreview } from "./WhatsNew.js";
import "./settings.css";

function UserBadge(): React.JSX.Element {
  return (
    <div className="vsh-user-badge" aria-label={`User: ${profile.handle}`}>
      <div className="vsh-user-badge-face">
        <img src={profile.avatar} alt="" />
        <span>{profile.handle}</span>
      </div>
    </div>
  );
}

function Information({
  id,
  shell,
}: {
  id: string;
  shell: XmbShell;
}): React.JSX.Element | null {
  const info = informationOf(id);
  if (info === undefined) return null;
  return (
    <section className="vsh-information" aria-label={`${info.title} information`}>
      <UserBadge />
      {info.icon === "" ? null : (
        <img className="vsh-info-art" src={info.icon} alt="" />
      )}
      <div
        className="vsh-info-fields"
        data-native-input="true"
        tabIndex={0}
        ref={(element) => {
          shell.content.scroll = element;
        }}
      >
        <dl>
          <div>
            <dt>Title</dt>
            <dd>
              <h1 tabIndex={-1} data-focus-default>
                {info.title}
              </h1>
            </dd>
          </div>
          {info.rows.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>Description</dt>
            <dd>{info.subtitle}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Document({
  id,
  shell,
}: {
  id: string;
  shell: XmbShell;
}): React.JSX.Element | null {
  const info = informationOf(id);
  if (info === undefined) return null;
  return (
    <section
      className="vsh-information vsh-text-page"
      aria-label={`${info.title} details`}
    >
      <UserBadge />
      <h1 className="vsh-document-title" tabIndex={-1} data-focus-default>
        {info.title}
      </h1>
      <div
        className="vsh-document"
        data-native-input="true"
        tabIndex={0}
        ref={(element) => {
          shell.content.scroll = element;
        }}
      >
        {info.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

function Options({
  page,
  shell,
}: {
  page: Extract<Page, { kind: "options" }>;
  shell: XmbShell;
}): React.JSX.Element {
  return (
    <section className="vsh-options vsh-option-panel" aria-label="Options">
      <div className="vsh-option-list" role="menu" aria-label="Item options">
        {optionsFor(page.id).map((option, index) => {
          const props = {
            className:
              index === page.selected ? "vsh-selection selected" : "vsh-selection",
            role: "menuitem",
            "data-focus-default": index === page.selected ? true : undefined,
            onFocus: (): void => {
              shell.content.select(index);
            },
            onMouseEnter: (): void => {
              shell.content.select(index);
            },
          };
          return option.action.kind === "link" ? (
            <a
              key={option.label}
              {...props}
              href={option.action.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                  return;
                event.preventDefault();
                shell.content.open(option.action);
              }}
            >
              {option.label}
            </a>
          ) : (
            <button
              key={option.label}
              {...props}
              type="button"
              onClick={() => {
                shell.content.open(option.action);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Choice({
  page,
  shell,
}: {
  page: Extract<Page, { kind: "choice" }>;
  shell: XmbShell;
}): React.JSX.Element {
  const current = shell.content.snapshot().preferences[page.setting];
  return (
    <section
      className="vsh-choice vsh-option-panel"
      aria-label={`${SETTING_LABELS[page.setting]} settings`}
    >
      <div
        className="vsh-option-list"
        role="menu"
        aria-label={SETTING_LABELS[page.setting]}
      >
        {CHOICES[page.setting].map((item, index) => (
          <button
            key={item.value}
            type="button"
            role="menuitemradio"
            aria-checked={String(current) === item.value}
            aria-label={item.label}
            data-focus-default={index === page.selected ? true : undefined}
            className={
              index === page.selected ? "vsh-selection selected" : "vsh-selection"
            }
            onFocus={() => {
              shell.content.select(index);
            }}
            onMouseEnter={() => {
              shell.content.select(index);
            }}
            onClick={() => {
              shell.content.select(index);
              shell.content.confirm();
            }}
          >
            {item.swatch === undefined ? (
              item.label
            ) : (
              <span
                className="vsh-color-swatch"
                style={{ backgroundColor: item.swatch }}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>
      {page.selected < CHOICES[page.setting].length - 1 ? (
        <span className="vsh-option-more" aria-hidden="true">
          ▾
        </span>
      ) : null}
    </section>
  );
}

function Gallery({
  page,
  shell,
}: {
  page: Extract<Page, { kind: "gallery" }>;
  shell: XmbShell;
}): React.JSX.Element {
  const project = projectOf(page.id);
  const photo = project?.images[page.index];
  return (
    <section className="vsh-media" aria-label={`${project?.title ?? "Project"} images`}>
      <img
        key={photo?.src}
        src={photo?.src}
        alt={photo?.title ?? "Project image"}
        onError={() => {
          shell.content.fail(
            "The image could not load. Return to Information and try again.",
          );
        }}
      />
      <p className="vsh-media-caption" tabIndex={-1} data-focus-default>
        {photo?.title}{" "}
        <span>
          {page.index + 1} / {project?.images.length ?? 0}
        </span>
      </p>
      {page.controls ? (
        <div className="vsh-media-controls" aria-label="Photo controls">
          <button
            aria-label="Previous"
            type="button"
            data-native-input="true"
            onClick={() => {
              shell.content.image(-1);
            }}
          >
            ◁ <span>Previous</span>
          </button>
          <button
            aria-label="Next"
            type="button"
            data-native-input="true"
            onClick={() => {
              shell.content.image(1);
            }}
          >
            ▷ <span>Next</span>
          </button>
          <button
            aria-label="Set as Wallpaper"
            type="button"
            data-native-input="true"
            onClick={() => {
              if (photo !== undefined) shell.content.setWallpaper(photo.src);
            }}
          >
            ▧ <span>Set as Wallpaper</span>
          </button>
          <button
            aria-label="Back to information"
            type="button"
            data-native-input="true"
            onClick={() => {
              shell.content.back();
            }}
          >
            ○ <span>Back</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
