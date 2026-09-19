import { appUrl } from "../runtime/path.js";
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

function BrowserIcon({ name }: { name: string }): React.JSX.Element {
  return import.meta.env.DEV ? (
    <img className="webview-icon" src={`/original/browser/tex_${name}.png`} alt="" />
  ) : (
    <svg
      className="webview-icon"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name] ?? ICON_PATHS["topbaricon"]} />
    </svg>
  );
}

export function WebView({ browser }: { browser: WebBrowser }): React.JSX.Element {
  const state = useSyncExternalStore(browser.subscribe, browser.snapshot);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState("");
  const [invalid, setInvalid] = useState(false);
  const win = browser.window;
  const entry = browser.entry;
  const shownPanel = state.panel ?? state.departing;
  const form = shownPanel === "address" || shownPanel === "search";
  const home = entry.href === BROWSER_HOME;

  useLayoutEffect(() => {
    if (state.panel !== undefined && !form && state.panel !== "information")
      rootRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"][data-selected="true"]')
        ?.focus({ preventScroll: true });
  }, [state.panel, state.selected, form]);

  useEffect(() => {
    if (state.panel === "address" || state.panel === "search") {
      setAddress(state.panel === "address" && !home ? entry.href : "");
      setInvalid(false);
      addressRef.current?.focus();
    }
  }, [state.panel, entry.href, home]);

  useEffect(() => {
    const key = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        browser.panel("address");
      } else if (event.ctrlKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        browser.action("refresh");
      } else if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        browser.history(-1);
      } else if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        browser.history(1);
      }
    };
    globalThis.addEventListener("keydown", key);
    return () => {
      globalThis.removeEventListener("keydown", key);
    };
  }, [browser]);

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const href =
      state.panel === "search"
        ? `https://www.google.com/search?q=${encodeURIComponent(address)}`
        : address;
    if (!browser.open(href)) setInvalid(true);
  };

  const loaded = (): void => {
    if (win === undefined) return;
    browser.loaded(win.id, win.revision);
    try {
      const doc = frameRef.current?.contentDocument;
      if (doc === null || doc === undefined) return;
      const style = doc.createElement("style");
      style.textContent = import.meta.env.DEV
        ? `html,body{cursor:url('/original/browser/pointer-arrow.png') 17 1,default}a,button{cursor:url('/original/browser/pointer-finger.png') 15 1,pointer}`
        : `html,body{cursor:url('${appUrl("/portfolio/cursor.svg")}') 2 1,default}a,button{cursor:pointer}`;
      doc.head.append(style);
      doc.addEventListener("click", (event) => {
        const element = event.target;
        if (element === null || !("closest" in element)) return;
        const link = (element as Element).closest<HTMLAnchorElement>("a[href]");
        if (link === null || link.href.startsWith("javascript:")) return;
        if (link.target === "_blank" || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        browser.open(link.href, link.textContent.trim() || link.href);
      });
    } catch {
      return;
    }
  };

  return (
    <section
      ref={rootRef}
      className="webview"
      role="dialog"
      aria-modal="true"
      aria-label="Internet Browser"
      data-maximum={state.maximum}
      style={{ "--browser-panel-alpha": state.panelAlpha } as CSSProperties}
    >
      <header className="webview-bar webview-topbar">
        <button
          type="button"
          className="webview-menu-toggle"
          data-native-input
          data-focus-default
          aria-label="Browser menu"
          onClick={() => {
            browser.panel(state.panel === undefined ? "menu" : undefined);
          }}
        >
          <BrowserIcon name="topbaricon" />
        </button>
        <button
          type="button"
          className="webview-address"
          data-native-input
          aria-label="Enter address"
          onClick={() => {
            browser.panel("address");
          }}
        >
          <span>{entry.title}</span>
          <span>{home ? "" : entry.href}</span>
        </button>
        {win?.loading && !browser.blocked ? (
          <span className="webview-busy" role="status" aria-label="Loading page" />
        ) : null}
      </header>
      <div
        className="webview-page"
        style={{ "--browser-zoom": state.zoom } as CSSProperties}
      >
        {home ? (
          <article className="webview-home">
            <h1>{profile.handle}</h1>
            <p>{profile.biography[0]}</p>
            <ul>
              {projects
                .filter((project) => project.website !== "")
                .map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      data-native-input
                      onClick={() => browser.open(project.website, project.title)}
                    >
                      {project.title}
                    </button>
                    <p>{project.description}</p>
                  </li>
                ))}
            </ul>
            <button
              type="button"
              data-native-input
              onClick={() => browser.open(profile.website, "dayetu.group")}
            >
              dayetu.group
            </button>
          </article>
        ) : browser.blocked || win?.failed ? (
          <article className="webview-error" role="status">
            <p>This page cannot be displayed here.</p>
            <a href={entry.href} target="_blank" rel="noopener noreferrer">
              Open in New Tab
            </a>
          </article>
        ) : win === undefined ? null : (
          <iframe
            key={`${String(win.id)}:${String(win.revision)}`}
            ref={frameRef}
            title={entry.title}
            src={entry.href}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            onLoad={loaded}
            onError={() => {
              browser.loaded(win.id, win.revision, true);
            }}
          />
        )}
      </div>
      <footer className="webview-bar webview-statusbar">
        <button
          type="button"
          data-native-input
          onClick={() => {
            browser.panel(state.panel === undefined ? "menu" : undefined);
          }}
        >
          <ControlGlyph binding="options" /> Menu
        </button>
        {home ? null : (
          <a href={entry.href} target="_blank" rel="noopener noreferrer">
            Open in New Tab
          </a>
        )}
        <button
          type="button"
          data-native-input
          onClick={() => {
            browser.action("exit");
          }}
        >
          <ControlGlyph binding="cancel" /> Back
        </button>
      </footer>
      {shownPanel === undefined ? null : (
        <aside
          className="webview-options"
          aria-label="Browser options"
          inert={state.panel === undefined}
        >
          {form ? (
            <form onSubmit={submit} className="webview-form" data-native-input>
              <label htmlFor="webview-url">
                {shownPanel === "search" ? "Search" : "Address Entry"}
              </label>
              <input
                ref={addressRef}
                id="webview-url"
                autoComplete="off"
                spellCheck={false}
                type={shownPanel === "search" ? "search" : "text"}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                }}
              />
              <button type="submit">Enter</button>
              {invalid ? <p role="alert">Enter an http or https address.</p> : null}
            </form>
          ) : shownPanel === "information" ? (
            <dl className="webview-page-info">
              <dt>Title</dt>
              <dd>{entry.title}</dd>
              <dt>Address</dt>
              <dd>{entry.href}</dd>
            </dl>
          ) : (
            <div
              role="menu"
              aria-label={shownPanel === "menu" ? "Browser menu" : shownPanel}
            >
              {browser.options().map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  aria-disabled={option.disabled}
                  data-selected={state.selected === index}
                  data-browser-item={option.id}
                  onPointerEnter={() => {
                    browser.select(index);
                  }}
                  onFocus={() => {
                    browser.select(index);
                  }}
                  onClick={() => {
                    browser.action(option.id);
                  }}
                >
                  {option.icon === undefined ? null : (
                    <BrowserIcon name={option.icon} />
                  )}
                  <span>{option.label}</span>
                  {option.hint === undefined ? null : <small>{option.hint}</small>}
                  {option.child ? <b aria-hidden="true">▸</b> : null}
                </button>
              ))}
            </div>
          )}
          {shownPanel === "menu" ? null : (
            <button
              className="webview-panel-back"
              type="button"
              data-native-input
              onClick={() => {
                browser.panel("menu");
              }}
            >
              ◂ Back
            </button>
          )}
        </aside>
      )}
    </section>
  );
}
