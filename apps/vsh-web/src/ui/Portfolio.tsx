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

function time(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function Video({
  page,
  shell,
}: {
  page: Extract<Page, { kind: "video" }>;
  shell: XmbShell;
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const project = projectOf(page.id);
  useEffect(() => {
    const video = videoRef.current;
    shell.content.video = video;
    if (video !== null)
      void video.play().catch(() => {
        setPlaying(false);
      });
    return () => {
      video?.pause();
      shell.content.video = null;
    };
  }, [shell]);
  return (
    <section className="vsh-media" aria-label={`${project?.title ?? "Project"} video`}>
      <video
        ref={videoRef}
        src={project?.video}
        playsInline
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onTimeUpdate={(event) => {
          setPosition(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
        }}
        onError={() => {
          shell.content.fail(
            "The video could not load. Return to Information and try again.",
          );
        }}
      />
      <p className="vsh-media-caption" tabIndex={-1} data-focus-default>
        {project?.title}
      </p>
      {page.controls ? (
        <div className="vsh-media-controls" aria-label="Video controls">
          <button
            type="button"
            data-native-input="true"
            onClick={() => {
              shell.content.seek(-1);
            }}
            aria-label="Rewind"
          >
            ◁◁ <span>Rewind</span>
          </button>
          <button
            type="button"
            data-native-input="true"
            onClick={() => {
              shell.content.toggleVideo();
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "Ⅱ" : "▷"} <span>{playing ? "Pause" : "Play"}</span>
          </button>
          <button
            type="button"
            data-native-input="true"
            onClick={() => {
              shell.content.seek(1);
            }}
            aria-label="Forward"
          >
            ▷▷ <span>Forward</span>
          </button>
          <label className="vsh-seek">
            <span>
              {time(position)} / {time(duration)}
            </span>
            <input
              aria-label="Video position"
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={position}
              onChange={(event) => {
                if (videoRef.current !== null)
                  videoRef.current.currentTime = Number(event.target.value);
              }}
            />
          </label>
          <button
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

export function Portfolio({ shell }: { shell: XmbShell }): React.JSX.Element {
  const device = useSyncExternalStore(shell.subscribe, shell.inputDevice);
  const snapshot = useSyncExternalStore(shell.subscribe, shell.content.snapshot);
  const described = useSyncExternalStore(shell.subscribe, shell.describe);
  const preview = useSyncExternalStore(shell.subscribe, () => shell.preview);
  const welcomePreview = useSyncExternalStore(
    shell.subscribe,
    () => shell.whatsNewPreview,
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const pages = snapshot.pages.length > 0 ? snapshot.pages : snapshot.departing;
  const closing = snapshot.pages.length === 0 && pages.length > 0;
  const top = pages.at(-1);
  const pageKey =
    top === undefined
      ? "menu"
      : `${top.kind}:${"id" in top ? top.id : top.kind === "choice" ? top.setting : "message"}`;
  const selected =
    top?.kind === "options" || top?.kind === "choice" || top?.kind === "profile"
      ? top.selected
      : -1;
  const currentId =
    top?.kind === "information"
      ? top.id
      : described.items.find((item) => item.focused)?.id;
  const hasOptions =
    top?.kind === "gallery" ||
    top?.kind === "video" ||
    top?.kind === "options" ||
    ((top === undefined || top.kind === "information") &&
      currentId !== undefined &&
      optionsFor(currentId).length > 0);
  useEffect(() => {
    const update = (): void => {
      const parent = surfaceRef.current?.parentElement;
      parent?.style.setProperty("--content-alpha", String(shell.panelAlpha));
      const state = shell.content.snapshot();
      const pages = state.pages.length > 0 ? state.pages : state.departing;
      parent?.style.setProperty(
        "--whats-new-alpha",
        String(
          Math.max(
            shell.whatsNewAlpha,
            pages.at(-1)?.kind === "whats-new" ? shell.panelAlpha : 0,
          ),
        ),
      );
      parent?.style.setProperty(
        "--board-shift",
        String(pages.at(-1)?.kind === "board" ? shell.panelAlpha : 0),
      );
      if (parent !== null && parent !== undefined) {
        parent.dataset["information"] = String(
          pages.some((page) => page.kind === "information" || page.kind === "profile"),
        );
        parent.dataset["about"] = String(pages.some((page) => page.kind === "about"));
        parent.dataset["system"] = String(pages.some((page) => page.kind === "system"));
        parent.dataset["browser"] = String(
          pages.some((page) => page.kind === "browser"),
        );
        parent.dataset["board"] = String(pages.at(-1)?.kind === "board");
        parent.dataset["whatsNew"] = String(pages.at(-1)?.kind === "whats-new");
        parent.dataset["whatsNewPreview"] = String(
          shell.whatsNewAlpha > 0 && pages.at(-1)?.kind !== "whats-new",
        );
        parent.dataset["font"] = state.preferences.font;
        parent.dataset["nested"] = String(shell.state.levels.length > 1);
        parent.dataset["nestedSettings"] = String(
          shell.state.levels.length > 1 && shell.describe().category === "Settings",
        );
        parent.dataset["sidePanel"] = String(
          pages.at(-1)?.kind === "choice" ||
            pages.at(-1)?.kind === "options" ||
            pages.at(-1)?.kind === "board",
        );
      }
      parent?.style.setProperty(
        "--menu-dim",
        pages.at(-1)?.kind === "whats-new"
          ? "0"
          : pages.at(-1)?.kind === "board"
            ? "0.82"
            : pages.length === 1 &&
                (pages[0]?.kind === "options" || pages[0]?.kind === "choice")
              ? "0.12"
              : "1",
      );
      surfaceRef.current?.style.setProperty("--panel-alpha", String(shell.panelAlpha));
      surfaceRef.current?.style.setProperty("--page-alpha", String(shell.pageAlpha));
      surfaceRef.current?.style.setProperty(
        "--option-offset",
        String(shell.optionOffset),
      );
      previewRef.current?.style.setProperty("opacity", String(shell.previewAlpha));
    };
    update();
    return shell.subscribe(update);
  }, [shell]);
  useEffect(() => {
    if (top === undefined || closing) {
      document
        .querySelector<HTMLElement>(
          `[data-entry-id="${CSS.escape(shell.describe().items.find((item) => item.focused)?.id ?? "")}"]`,
        )
        ?.focus({ preventScroll: true });
    } else
      surfaceRef.current
        ?.querySelector<HTMLElement>("[data-top-layer] [data-focus-default]")
        ?.focus({ preventScroll: true });
  }, [pageKey, selected, shell, closing]);
  const base = pages.find((page) => page.kind === "information");
  return (
    <>
      <div className="wn-backdrop" aria-hidden="true" />
      {welcomePreview ? <WhatsNewPreview shell={shell} /> : null}
      {top === undefined ? (
        <BoardTicker
          board={shell.board}
          subscribe={shell.subscribe}
          onOpen={() => {
            shell.content.open({ kind: "board" });
          }}
        />
      ) : null}
      {snapshot.preferences.wallpaper !== "" ? (
        <img
          className="vsh-wallpaper"
          src={snapshot.preferences.wallpaper}
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={previewRef}
        className="vsh-preview"
        aria-hidden="true"
        hidden={preview === undefined || top !== undefined}
      >
        {preview === undefined ? null : (
          <img
            key={preview}
            src={preview}
            alt=""
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        )}
      </div>
      <div
        ref={surfaceRef}
        className="vsh-content"
        data-open={top !== undefined}
        inert={closing}
        onKeyDown={(event) => {
          if (event.key !== "Tab" || top === undefined) return;
          const elements = surfaceRef.current?.querySelectorAll<HTMLElement>(
            '[data-top-layer] button, [data-top-layer] a, [data-top-layer] input, [data-top-layer] [tabindex="0"]',
          );
          const first = elements?.[0];
          const last = elements?.[elements.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement?.hasAttribute("data-focus-default"))
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        {base === undefined ? null : (
          <div
            className="vsh-layer"
            hidden={
              top?.kind === "document" ||
              top?.kind === "gallery" ||
              top?.kind === "video" ||
              top?.kind === "browser"
            }
            inert={top !== base}
            data-top-layer={top === base ? true : undefined}
          >
            <Information id={base.id} shell={shell} />
          </div>
        )}
        {top === undefined || top.kind === "information" ? null : (
          <div className="vsh-layer" data-top-layer>
            {top.kind === "options" ? <Options page={top} shell={shell} /> : null}
            {top.kind === "choice" ? <Choice page={top} shell={shell} /> : null}
            {top.kind === "gallery" ? <Gallery page={top} shell={shell} /> : null}
            {top.kind === "video" ? <Video page={top} shell={shell} /> : null}
            {top.kind === "document" ? <Document id={top.id} shell={shell} /> : null}
            {top.kind === "about" ? <About shell={shell} /> : null}
            {top.kind === "system" ? <SystemInformation shell={shell} /> : null}
            {top.kind === "profile" ? <Profile page={top} shell={shell} /> : null}
            {top.kind === "browser" ? (
              <WebView browser={shell.content.browser} />
            ) : null}
            {top.kind === "whats-new" ? <WhatsNew shell={shell} /> : null}
            {top.kind === "board" ? (
              <InformationBoard
                board={shell.board}
                subscribe={shell.subscribe}
                onCommand={(command) => {
                  shell.boardCommand(command);
                }}
                onClose={() => {
                  shell.content.back();
                }}
                onNavigate={(href) => {
                  shell.content.open({ kind: "browser", href });
                }}
              />
            ) : null}
            {top.kind === "message" ? (
              <section
                className="vsh-message"
                role="alertdialog"
                aria-modal="true"
                aria-label="Message"
              >
                <p>{top.text}</p>
                <button
                  type="button"
                  data-native-input="true"
                  data-focus-default
                  onClick={() => {
                    shell.content.back();
                  }}
                >
                  OK
                </button>
              </section>
            ) : null}
          </div>
        )}
      </div>
      <footer
        className="vsh-controls"
        aria-label="Navigation controls"
        data-input-device={device}
        data-information={
          top?.kind === "information" ||
          top?.kind === "document" ||
          top?.kind === "system"
        }
        data-media={top?.kind === "gallery" || top?.kind === "video"}
        data-closing={closing}
        hidden={
          (top === undefined &&
            (described.depth === 0 || described.category !== "Settings")) ||
          top?.kind === "about" ||
          top?.kind === "browser" ||
          top?.kind === "whats-new" ||
          top?.kind === "board"
        }
      >
        {top?.kind === "information" ||
        top?.kind === "document" ||
        top?.kind === "system" ? null : (
          <button
            type="button"
            data-binding="decide"
            data-native-input="true"
            title={device === "keyboard" ? "Enter" : undefined}
            aria-keyshortcuts={device === "keyboard" ? "Enter" : undefined}
            onClick={() => {
              shell.command("decide");
            }}
          >
            <ControlGlyph binding="decide" />
            <span>{top?.kind === "video" ? "Play / Pause" : "Enter"}</span>
          </button>
        )}
        {top === undefined && described.depth === 0 ? null : (
          <button
            type="button"
            data-binding="cancel"
            data-native-input="true"
            title={device === "keyboard" ? "Escape" : undefined}
            aria-keyshortcuts={device === "keyboard" ? "Escape" : undefined}
            onClick={() => {
              shell.command("cancel");
            }}
          >
            <ControlGlyph binding="cancel" /> <span>Back</span>
          </button>
        )}
        {hasOptions && top?.kind !== "information" ? (
          <button
            type="button"
            data-binding="options"
            data-native-input="true"
            title={device === "keyboard" ? "T" : undefined}
            aria-keyshortcuts={device === "keyboard" ? "T" : undefined}
            onClick={() => {
              shell.command("options");
            }}
          >
            <ControlGlyph binding="options" />
            <span>
              {top?.kind === "gallery" || top?.kind === "video"
                ? "Control Panel"
                : "Options"}
            </span>
          </button>
        ) : null}
      </footer>
    </>
  );
}
