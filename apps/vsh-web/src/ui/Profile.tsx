import { profile, projects } from "@vsh/content";
import type { Page } from "../runtime/presentation.js";
import type { XmbShell } from "../runtime/shell.js";
import "./profile.css";

const ACTIONS = ["GitHub", "Website", "Details"] as const;

export function Profile({
  page,
  shell,
}: {
  page: Extract<Page, { kind: "profile" }>;
  shell: XmbShell;
}): React.JSX.Element {
  const details =
    page.tab === 0
      ? [
          ["Name", profile.name],
          ["Location", profile.location],
          ["Website", profile.website.replace("https://", "")],
        ]
      : projects.map((project) => [project.title, project.language]);
  return (
    <section
      className="vsh-profile"
      data-original={import.meta.env.DEV}
      aria-label={`${profile.handle} profile`}
    >
      <header className="vsh-profile-header">
        <div className="vsh-profile-avatar">
          <img src={profile.avatar} alt={`${profile.handle} avatar`} />
        </div>
        <div className="vsh-profile-status">
          <div className="vsh-profile-balloon">
            <p>{profile.biography.join(" ")}</p>
          </div>
          <h1>
            <span className="vsh-profile-presence" aria-hidden="true" />
            {profile.handle}
          </h1>
          <p className="vsh-profile-location">{profile.location}</p>
        </div>
      </header>
      <div className="vsh-profile-detail">
        <nav className="vsh-profile-tabs" aria-label="Profile information">
          <button
            type="button"
            data-native-input="true"
            aria-label="Previous information"
            title="L1 / Page Up"
            aria-keyshortcuts="PageUp"
            onClick={() => {
              shell.content.profileTab(page.tab - 1);
            }}
          >
            <span className="vsh-profile-shoulder" data-side="l1">
              L1
            </span>
            <span aria-hidden="true">◀</span>
          </button>
          <div className="vsh-profile-tab-dots">
            {["About", "Projects"].map((name, index) => (
              <button
                key={name}
                type="button"
                data-native-input="true"
                aria-label={name}
                aria-current={page.tab === index ? "page" : undefined}
                onClick={() => {
                  shell.content.profileTab(index);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            data-native-input="true"
            aria-label="Next information"
            title="R1 / Page Down"
            aria-keyshortcuts="PageDown"
            onClick={() => {
              shell.content.profileTab(page.tab + 1);
            }}
          >
            <span aria-hidden="true">▶</span>
            <span className="vsh-profile-shoulder" data-side="r1">
              R1
            </span>
          </button>
        </nav>
        <dl
          className="vsh-profile-fields"
          data-native-input="true"
          aria-label={page.tab === 0 ? "About" : "Projects"}
          tabIndex={0}
          ref={(element) => {
            shell.content.scroll = element;
          }}
        >
          {details.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <nav className="vsh-profile-actions" aria-label="Profile actions">
        {ACTIONS.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            data-focus-default={page.selected === index ? true : undefined}
            className={page.selected === index ? "selected" : undefined}
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
            <svg
              viewBox="0 0 32 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {index === 0 ? (
                <path d="m11 5-7 7 7 7m10-14 7 7-7 7m-3-16-4 20" />
              ) : index === 1 ? (
                <>
                  <circle cx="16" cy="12" r="10" />
                  <ellipse cx="16" cy="12" rx="4.5" ry="10" />
                  <path d="M6 12h20M8 6h16M8 18h16" />
                </>
              ) : (
                <>
                  <path d="M8 2h11l5 5v15H8ZM19 2v6h5M12 12h8M12 16h8" />
                </>
              )}
            </svg>
          </button>
        ))}
        <span className="vsh-profile-action-label" aria-live="polite">
          {ACTIONS[page.selected]}
        </span>
      </nav>
    </section>
  );
}
