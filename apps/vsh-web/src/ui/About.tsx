import { appUrl } from "../runtime/path.js";
import { useLayoutEffect, useRef } from "react";
import { profile, siteCredits, researchCredits } from "@vsh/content";
import type { XmbShell } from "../runtime/shell.js";
import "./about.css";

export function About({ shell }: { shell: XmbShell }): React.JSX.Element {
  const surfaceRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const scaleRef = useRef(1);
  const touchY = useRef<number | undefined>(undefined);
  const refresh = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const strip = stripRef.current;
    if (surface === null || strip === null) return;
    let active = true;
    const update = (): void => {
      const frame = shell.about?.frame;
      strip.style.transform = `translate3d(0, ${String((frame?.top ?? surface.clientHeight / scaleRef.current) * scaleRef.current)}px, 0)`;
      if (pauseRef.current !== null) {
        const label = frame?.paused === true ? "Resume" : "Pause";
        if (pauseRef.current.textContent !== label)
          pauseRef.current.textContent = label;
        pauseRef.current.setAttribute("aria-pressed", String(frame?.paused === true));
      }
    };
    const measure = (): void => {
      if (!active) return;
      scaleRef.current = Number.parseFloat(getComputedStyle(strip).fontSize) / 23;
      shell.setAboutLayout(
        strip.getBoundingClientRect().height / scaleRef.current,
        surface.clientHeight / scaleRef.current,
      );
      update();
    };
    refresh.current = update;
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    observer.observe(strip);
    const unsubscribe = shell.subscribe(update);
    measure();
    void document.fonts.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
      unsubscribe();
      refresh.current = () => undefined;
    };
  }, [shell]);

  const scroll = (pixels: number): void => {
    const roll = shell.about;
    if (roll === undefined) return;
    roll.seek(roll.frame.offset + pixels / scaleRef.current);
    refresh.current();
  };

  return (
    <section
      ref={surfaceRef}
      className="vsh-about"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vsh-about-title"
      aria-describedby="vsh-about-instructions"
      data-native-input="true"
      onWheel={(event) => {
        const unit =
          event.deltaMode === 1
            ? 34 * scaleRef.current
            : event.deltaMode === 2
              ? event.currentTarget.clientHeight
              : 1;
        scroll(event.deltaY * unit);
      }}
      onTouchStart={(event) => {
        touchY.current =
          event.target instanceof Element && event.target.closest("button") !== null
            ? undefined
            : event.touches[0]?.clientY;
      }}
      onTouchMove={(event) => {
        const next = event.touches[0]?.clientY;
        if (next === undefined || touchY.current === undefined) return;
        scroll(touchY.current - next);
        touchY.current = next;
      }}
      onTouchEnd={() => {
        touchY.current = undefined;
      }}
      onTouchCancel={() => {
        touchY.current = undefined;
      }}
    >
      <h1
        id="vsh-about-title"
        className="vsh-about-accessible"
        tabIndex={-1}
        data-focus-default
      >
        About This Site
      </h1>
      <p id="vsh-about-instructions" className="vsh-about-accessible">
        Press Enter to pause or resume. Hold Up or Down to move through the credits.
        Press Escape to return.
      </p>
      <div ref={stripRef} className="vsh-about-strip">
        <p className="vsh-about-intro">
          XMP is {profile.handle}&apos;s portfolio, built as a browser interpretation of
          the PlayStation 3 XrossMediaBar. This page credits the software, research,
          recordings, and people behind this website.
        </p>
        <p className="vsh-about-block vsh-about-centered">
          Design and development by {profile.handle}.
        </p>
        <p className="vsh-about-block vsh-about-centered">
          The interface takes its inspiration from the PlayStation 3 XrossMediaBar.
        </p>
        {siteCredits.map((credit) => (
          <section
            className="vsh-about-block vsh-about-technology"
            key={credit.title}
            aria-label={credit.title}
          >
            {"image" in credit ? (
              <img
                src={appUrl(credit.image)}
                alt={`${credit.title} logo`}
                width={180}
                height={180}
              />
            ) : null}
            <h2>
              <a href={credit.href} target="_blank" rel="noopener noreferrer">
                {credit.title}
              </a>
            </h2>
            <p>{credit.text}</p>
          </section>
        ))}
        {researchCredits.map((credit) => (
          <section
            className="vsh-about-block"
            key={credit.title}
            aria-label={credit.title}
          >
            <h2>
              <a href={credit.href} target="_blank" rel="noopener noreferrer">
                {credit.title}
              </a>
            </h2>
            <p>{credit.text}</p>
          </section>
        ))}
        <p className="vsh-about-block">
          The startup wordmark was created with OpenAI&apos;s image tool. Technology
          logos come from their official projects. Original console files serve as local
          research references and are excluded from the published site.
        </p>
        <p className="vsh-about-block">
          This is an independent portfolio. It is not affiliated with Sony Interactive
          Entertainment. PlayStation and XrossMediaBar belong to their respective
          owners.
        </p>
        <p className="vsh-about-block vsh-about-centered">Thank you for visiting.</p>
      </div>
      <div className="vsh-about-controls" aria-label="Credits controls">
        <button
          ref={pauseRef}
          type="button"
          aria-pressed="false"
          onClick={() => {
            shell.command("decide");
            refresh.current();
          }}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => {
            shell.command("cancel");
          }}
        >
          Back
        </button>
      </div>
    </section>
  );
}
