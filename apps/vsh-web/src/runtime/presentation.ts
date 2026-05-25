import {
  DEFAULT_PREFERENCES,
  THEME_CHOICES,
  changePreference,
  informationOf,
  optionsFor,
  profile,
  projectOf,
} from "@vsh/content";
import type { ChoiceSetting, ContentAction, Preferences } from "@vsh/content";
import type { Command } from "@vsh/libpad";
import { design } from "@vsh/qgl";
import { WebBrowser } from "./browser.js";

export type Page =
  | { readonly kind: "browser" }
  | { readonly kind: "board" }
  | { readonly kind: "whats-new" }
  | { readonly kind: "about" }
  | { readonly kind: "system" }
  | { readonly kind: "profile"; readonly tab: number; readonly selected: number }
  | { readonly kind: "information"; readonly id: string }
  | { readonly kind: "document"; readonly id: string }
  | { readonly kind: "options"; readonly id: string; readonly selected: number }
  | {
      readonly kind: "gallery";
      readonly id: string;
      readonly index: number;
      readonly controls: boolean;
    }
  | { readonly kind: "video"; readonly id: string; readonly controls: boolean }
  | {
      readonly kind: "choice";
      readonly setting: ChoiceSetting;
      readonly selected: number;
    }
  | { readonly kind: "message"; readonly text: string };

export interface PresentationSnapshot {
  readonly pages: readonly Page[];
  readonly departing: readonly Page[];
  readonly preferences: Preferences;
}

export const CHOICES = THEME_CHOICES;

const SCROLL_STEP = design(96);
const SEEK_SECONDS = design(5);

interface Callbacks {
  readonly change: () => void;
  readonly route: (id: string | undefined) => void;
  readonly preferences: (value: Preferences) => void;
  readonly link: (href: string) => void;
  readonly sound: (kind: "decide" | "cancel" | "cursor") => void;
  readonly boardDisplay?: (enabled: boolean) => void;
}

export class Presentation {
  readonly browser: WebBrowser;
  readonly #callbacks: Callbacks;
  #snapshot: PresentationSnapshot;
  scroll: HTMLElement | null = null;
  video: HTMLVideoElement | null = null;

  constructor(callbacks: Callbacks, preferences = DEFAULT_PREFERENCES) {
    this.#callbacks = callbacks;
    this.#snapshot = { pages: [], departing: [], preferences };
    this.browser = new WebBrowser(callbacks.link, () => {
      this.back();
    });
  }

  readonly snapshot = (): PresentationSnapshot => this.#snapshot;

  get top(): Page | undefined {
    return this.#snapshot.pages.at(-1);
  }

  #set(pages: readonly Page[]): void {
    const departing = pages.length === 0 ? this.#snapshot.pages : [];
    this.#snapshot = { ...this.#snapshot, pages, departing };
    this.#callbacks.change();
  }

  finishExit(): void {
    if (this.#snapshot.departing.length === 0) return;
    this.#snapshot = { ...this.#snapshot, departing: [] };
    this.#callbacks.change();
  }

  #replace(page: Page): void {
    this.#set([...this.#snapshot.pages.slice(0, -1), page]);
  }

  restore(id: string | undefined): void {
    this.video?.pause();
    this.#set(
      id === undefined
        ? []
        : id === "profile"
          ? [{ kind: "profile", tab: 0, selected: 0 }]
          : informationOf(id) === undefined
            ? [{ kind: "message", text: "This project is not available." }]
            : [{ kind: "information", id }],
    );
  }

  open(action: ContentAction): void {
    this.#callbacks.sound("decide");
    if (action.kind === "board-display") {
      this.#callbacks.boardDisplay?.(action.enabled);
      this.back();
      return;
    }
    if (action.kind === "browser") {
      if (this.browser.open(action.href, action.title))
        this.#set([
          ...this.#snapshot.pages.filter(
            (page) => page.kind !== "options" && page.kind !== "browser",
          ),
          { kind: "browser" },
        ]);
      return;
    }
    if (action.kind === "board") {
      this.#set([{ kind: "board" }]);
      return;
    }
    if (action.kind === "whats-new") {
      this.#set([{ kind: "whats-new" }]);
      return;
    }
    if (action.kind === "link") {
      this.#callbacks.link(action.href);
      return;
    }
    if (action.kind === "about") {
      this.#set([{ kind: "about" }]);
      return;
    }
    if (action.kind === "system") {
      this.#set([{ kind: "system" }]);
      return;
    }
    if (action.kind === "profile") {
      this.#set([{ kind: "profile", tab: 0, selected: 0 }]);
      this.#callbacks.route("profile");
      return;
    }
    if (action.kind === "choice") {
      this.#set([
        ...this.#snapshot.pages.filter((page) => page.kind === "choice"),
        {
          kind: "choice",
          setting: action.setting,
          selected: CHOICES[action.setting].findIndex(
            (item) => item.value === String(this.#snapshot.preferences[action.setting]),
          ),
        },
      ]);
      return;
    }
    if (informationOf(action.id) === undefined) {
      this.fail("This item is not available.");
      return;
    }
    const fromWhatsNew = this.#snapshot.pages.some((page) => page.kind === "whats-new");
    const pages: Page[] = [
      ...this.#snapshot.pages.filter((page) => page.kind === "whats-new"),
      ...(fromWhatsNew && action.kind === "video"
        ? []
        : [{ kind: "information" as const, id: action.id }]),
    ];
    if (action.kind === "document") pages.push({ kind: "document", id: action.id });
    if (action.kind === "gallery") {
      if ((projectOf(action.id)?.images.length ?? 0) === 0) return;
      pages.push({ kind: "gallery", id: action.id, index: 0, controls: false });
    } else if (action.kind === "video") {
      if (!projectOf(action.id)?.video) return;
      pages.push({ kind: "video", id: action.id, controls: true });
    }
    this.#set(pages);
    if (!fromWhatsNew) this.#callbacks.route(action.id);
  }

  options(id: string): void {
    if (optionsFor(id).length === 0) return;
    this.#callbacks.sound("decide");
    this.#set([...this.#snapshot.pages, { kind: "options", id, selected: 0 }]);
  }

  back(): void {
    if (this.top === undefined) return;
    this.video?.pause();
    const wasInformation = this.top.kind === "information";
    this.#set(this.#snapshot.pages.slice(0, -1));
    this.#callbacks.sound("cancel");
    if (wasInformation || this.#snapshot.pages.length === 0)
      this.#callbacks.route(undefined);
  }

  fail(text: string): void {
    this.video?.pause();
    const pages = this.#snapshot.pages.filter(
      (page) =>
        page.kind !== "gallery" && page.kind !== "video" && page.kind !== "message",
    );
    this.#set([...pages, { kind: "message", text }]);
  }

  select(index: number): void {
    const page = this.top;
    if (page?.kind === "profile") {
      const selected = Math.max(0, Math.min(2, index));
      if (selected !== page.selected) {
        this.#replace({ ...page, selected });
        this.#callbacks.sound("cursor");
      }
      return;
    }
    if (page?.kind !== "options" && page?.kind !== "choice") return;
    const count =
      page.kind === "options"
        ? optionsFor(page.id).length
        : CHOICES[page.setting].length;
    const selected = Math.max(0, Math.min(count - 1, index));
    if (selected !== page.selected) {
      this.#replace({ ...page, selected });
      this.#callbacks.sound("cursor");
    }
  }

  confirm(): void {
    const page = this.top;
    if (page?.kind === "profile") {
      if (page.selected < 2) {
        this.#callbacks.sound("decide");
        this.#callbacks.link(page.selected === 0 ? profile.github : profile.website);
      } else {
        this.#callbacks.sound("decide");
        this.#set([...this.#snapshot.pages, { kind: "document", id: "profile" }]);
      }
    } else if (page?.kind === "options") {
      const option = optionsFor(page.id)[page.selected];
      if (option !== undefined) this.open(option.action);
    } else if (page?.kind === "choice") {
      const choice = CHOICES[page.setting][page.selected];
      if (choice === undefined) return;
      if (choice.setting !== undefined) {
        this.open({ kind: "choice", setting: choice.setting });
        return;
      }
      if (choice.value === "wallpaper" && this.#snapshot.preferences.wallpaper === "") {
        this.fail("Select an image in Projects, then choose Set as Wallpaper.");
        return;
      }
      const preferences = changePreference(
        this.#snapshot.preferences,
        page.setting,
        choice.value,
      );
      this.#snapshot = { ...this.#snapshot, preferences };
      this.#callbacks.preferences(preferences);
      this.back();
    } else if (page?.kind === "message") this.back();
    else if (page?.kind === "video") this.toggleVideo();
    else if (page?.kind === "information") this.options(page.id);
    else if (page?.kind === "gallery")
      this.#replace({ ...page, controls: !page.controls });
  }

  profileTab(index: number): void {
    const page = this.top;
    if (page?.kind !== "profile") return;
    const tab = ((index % 2) + 2) % 2;
    if (tab === page.tab) return;
    this.#replace({ ...page, tab });
    this.#callbacks.sound("cursor");
  }

  setWallpaper(src: string): void {
    if (!src.startsWith("/portfolio/")) return;
    const preferences: Preferences = {
      ...this.#snapshot.preferences,
      wallpaper: src,
      background: "wallpaper",
    };
    this.#snapshot = { ...this.#snapshot, preferences };
    this.#callbacks.preferences(preferences);
    this.#callbacks.change();
    this.#callbacks.sound("decide");
  }

  toggleVideo(): void {
    const video = this.video;
    if (video === null) return;
    if (video.paused)
      void video.play().catch(() => {
        this.fail("The video could not start. Return to Information and try again.");
      });
    else video.pause();
  }

  seek(direction: number): void {
    const video = this.video;
    if (video === null || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.duration, video.currentTime + direction * SEEK_SECONDS),
    );
  }

  image(direction: number): void {
    const page = this.top;
    if (page?.kind !== "gallery") return;
    const count = projectOf(page.id)?.images.length ?? 0;
    if (count < 1) return;
    this.#replace({ ...page, index: (page.index + direction + count) % count });
    this.#callbacks.sound("cursor");
  }

  command(command: Command): boolean {
    const page = this.top;
    if (page === undefined) return false;
    if (page.kind === "browser") {
      this.browser.command(command);
      return true;
    }
    if (
      command === "cancel" ||
      (command === "left" && (page.kind === "choice" || page.kind === "options"))
    )
      this.back();
    else if (command === "decide") this.confirm();
    else if (command === "options") {
      if (page.kind === "options") this.back();
      else if (page.kind === "information") this.options(page.id);
      else if (page.kind === "gallery" || page.kind === "video")
        this.#replace({ ...page, controls: !page.controls });
    } else if (page.kind === "profile") {
      if (command === "left" || command === "right")
        this.select(page.selected + (command === "right" ? 1 : -1));
      else if (command === "l1" || command === "r1")
        this.profileTab(page.tab + (command === "r1" ? 1 : -1));
      else this.scroll?.scrollBy({ top: (command === "down" ? 1 : -1) * SCROLL_STEP });
    } else if (page.kind === "choice" || page.kind === "options") {
      if (command === "up" || command === "down")
        this.select(page.selected + (command === "down" ? 1 : -1));
    } else if (page.kind === "information" || page.kind === "document") {
      if (command === "up" || command === "down")
        this.scroll?.scrollBy({ top: (command === "down" ? 1 : -1) * SCROLL_STEP });
    } else if (command === "left" || command === "right") {
      const direction = command === "right" ? 1 : -1;
      if (page.kind === "gallery") this.image(direction);
      else if (page.kind === "video") this.seek(direction);
    }
    return true;
  }
}
