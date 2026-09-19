import { appPath, appUrl } from "./path.js";
import type { Category, Entry } from "@vsh/explore-plugin";
import { actionFor, projectOf } from "@vsh/content";
import type { Preferences } from "@vsh/content";
import { Libaudio, SystemSound } from "@vsh/libaudio";
import type { SoundId } from "@vsh/libaudio";
import { Libpad, keyboard, touch } from "@vsh/libpad";
import type { Command, InputDevice } from "@vsh/libpad";
import {
  AccelMode,
  CATEGORY_MOVE,
  LEVEL_PUSH,
  PhXmShell,
  place,
  SUBMENU_PARENT_SHIFT,
} from "@vsh/paf";
import type { Metrics, Scalar, Snapshot, Spec, View } from "@vsh/paf";
import { hasChildren } from "@vsh/explore-plugin";
import { cancel, decide, focused, initial, list, move } from "@vsh/xmb-plugin";
import type { Dir, Effect, State, Step } from "@vsh/xmb-plugin";
import { design, verified } from "@vsh/qgl";
import { Presentation } from "./presentation.js";
import { ABOUT_EXIT_MS, AboutRoll } from "./about.js";
import { BOARD_EXPAND_MS, Board } from "./board.js";
import type { BoardCommand } from "./board.js";
import { WHATS_NEW, WhatsNew } from "./whats-new.js";

const PREVIEW_DELAY = design(650);
const OPTION_MOVE = { durationMs: verified(300), accelMode: AccelMode.Decelerate };
const MATERIAL_FADE = { durationMs: design(200), accelMode: AccelMode.Linear };

const DIRS: Readonly<Record<string, Dir>> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

const SOUND: Readonly<Record<Effect, SoundId | undefined>> = {
  none: undefined,
  cursor: SystemSound.Cursor,
  category: SystemSound.CategoryDecide,
  decide: SystemSound.Decide,
  cancel: SystemSound.Cancel,
  reject: SystemSound.Error,
};

const SOUND_BASE = "/original/sound/";

const EMPTY: Snapshot = {
  categories: [],
  categoryLabel: undefined,
  categoryLabels: [],
  items: [],
  labels: [],
};

export interface Described {
  readonly category: string;
  readonly depth: number;
  readonly categories: readonly { id: string; title: string; focused: boolean }[];
  readonly items: readonly {
    id: string;
    title: string;
    info: string;
    focused: boolean;
    folder: boolean;
  }[];
}

export interface ShellOpts {
  readonly cats: readonly Category[];
  readonly metrics: Metrics;
  readonly icons: Readonly<Record<number, string>>;
  readonly target: EventTarget;
  readonly onEffect: (effect: Effect) => void;
  readonly preferences: Preferences;
  readonly onPreferences: (value: Preferences) => void;
}

interface Column {
  state: State;
  offset: number;
  readonly alpha: Scalar;
}

export class XmbShell {
  readonly board = new Board();
  readonly whatsNew = new WhatsNew();
  #icons: Readonly<Record<string, string>>;
  readonly #baseIcons: Readonly<Record<number, string>>;
  #previousIcons: Readonly<Record<string, string>> = {};
  #pendingIcons:
    | {
        icons: Readonly<Record<string, string>>;
        spec: Spec;
        progress?: (value: number) => void;
      }
    | undefined;
  #materialProgress: ((value: number) => void) | undefined;
  readonly content: Presentation;
  readonly #cats: readonly Category[];
  readonly #metrics: Metrics;
  readonly #onEffect: (effect: Effect) => void;
  readonly #target: EventTarget;
  readonly #pad = new Libpad();
  readonly #audio = new Libaudio({
    base: SOUND_BASE,
    ids: import.meta.env.DEV ? Object.values(SystemSound) : [],
  });
  readonly #ph = new PhXmShell();
  readonly #watchers = new Set<() => void>();
  readonly #columns = new Map<number, Column>();
  readonly #categoryPositions = new Map<number, readonly number[]>();

  #dirty = false;
  #state: State = initial();
  #snap: Snapshot = EMPTY;
  #described: Described;
  #focusTime = 0;
  #previewTime = 0;
  #preview: string | undefined;
  readonly #previewAlpha = this.#ph.sched.add(0);
  readonly #whatsNewAlpha = this.#ph.sched.add(0);
  #whatsNewFocus = false;
  readonly #panelAlpha = this.#ph.sched.add(0);
  readonly #pageAlpha = this.#ph.sched.add(1);
  readonly #optionOffset = this.#ph.sched.add(0);
  readonly #depth = this.#ph.sched.add(0);
  readonly #iconBlend = this.#ph.sched.add(1);
  #parentState: State | undefined;
  #pageKey = "";
  #about: AboutRoll | undefined;
  #aboutLayout = "";
  #reduced = false;
  #inputDevice: InputDevice = globalThis.matchMedia("(pointer: coarse)").matches
    ? "touch"
    : "keyboard";

  constructor(opts: ShellOpts) {
    this.#icons = opts.icons;
    this.#baseIcons = opts.icons;
    this.#cats = opts.cats;
    this.#metrics = opts.metrics;
    this.#onEffect = opts.onEffect;
    this.#target = opts.target;
    this.content = new Presentation(
      {
        change: () => {
          const page = this.content.top;
          const key =
            page === undefined
              ? ""
              : `${page.kind}:${"id" in page ? page.id : page.kind === "choice" ? page.setting : "message"}`;
          if (key !== this.#pageKey) {
            if (page?.kind === "whats-new") this.whatsNew.open();
            else if (
              !this.content.snapshot().pages.some((entry) => entry.kind === "whats-new")
            )
              this.whatsNew.close();
            if (page?.kind === "board") {
              if (this.board.snapshot.mode === "ticker") this.board.open();
            } else if (
              !this.content.snapshot().pages.some((entry) => entry.kind === "board")
            )
              this.board.close();
            if (
              page?.kind !== "about" &&
              !this.content.snapshot().departing.some((entry) => entry.kind === "about")
            ) {
              this.#about = undefined;
              this.#aboutLayout = "";
            }
            this.#pageAlpha.snap(page?.kind === "information" ? 1 : 0);
            this.#pageAlpha.retarget(1, CATEGORY_MOVE);
            this.#pageKey = key;
            if (page?.kind === "choice" || page?.kind === "options")
              this.#optionOffset.snap(page.selected);
          }
          if (page?.kind === "choice" || page?.kind === "options")
            this.#optionOffset.retarget(page.selected, CATEGORY_MOVE);
          const panel = page ?? this.content.snapshot().departing.at(-1);
          this.#panelAlpha.retarget(
            this.content.top === undefined ? 0 : 1,
            panel?.kind === "choice" || panel?.kind === "options"
              ? OPTION_MOVE
              : panel?.kind === "about"
                ? { durationMs: ABOUT_EXIT_MS, accelMode: AccelMode.Linear }
                : panel?.kind === "whats-new"
                  ? { durationMs: WHATS_NEW.focusMs, accelMode: AccelMode.Decelerate }
                  : panel?.kind === "board"
                    ? { durationMs: BOARD_EXPAND_MS, accelMode: AccelMode.Linear }
                    : CATEGORY_MOVE,
          );
          this.#dirty = true;
        },
        route: (id) => {
          this.#route(id);
        },
        preferences: opts.onPreferences,
        boardDisplay: (enabled) => {
          this.board.setDisplay(enabled);
          this.#dirty = true;
        },
        link: (href) => {
          globalThis.history.replaceState(
            { ...this.#history(), focus: this.#state },
            "",
          );
          globalThis.open(href, "_blank", "noopener,noreferrer");
        },
        sound: (effect) => {
          this.#apply({ state: this.#state, effect });
        },
      },
      opts.preferences,
    );
    this.#pad.attach([keyboard(opts.target), touch(opts.target)]);
    opts.target.addEventListener("pointerdown", this.#pointer);
    opts.target.addEventListener("keydown", this.#keyboard);
    this.#columns.set(this.#state.category, {
      state: this.#state,
      offset: 0,
      alpha: this.#ph.sched.add(1),
    });
    this.#described = this.#describe();
    this.#restore();
    globalThis.addEventListener("popstate", this.#restore);
    this.#sync();
  }

  readonly subscribe = (fn: () => void): (() => void) => {
    this.#watchers.add(fn);

    return () => {
      this.#watchers.delete(fn);
    };
  };

  readonly snapshot = (): Snapshot => this.#snap;

  readonly inputDevice = (): InputDevice => this.#inputDevice;

  #setDevice(device: InputDevice): void {
    if (device === this.#inputDevice) return;
    this.#inputDevice = device;
    this.#dirty = true;
  }

  readonly #pointer = (event: Event): void => {
    this.#setDevice(
      (event as PointerEvent).pointerType === "touch" ? "touch" : "keyboard",
    );
  };

  readonly #keyboard = (): void => {
    this.#setDevice("keyboard");
  };

  get preview(): string | undefined {
    return this.#preview;
  }

  get icons(): Readonly<Record<string, string>> {
    return this.#icons;
  }

  get settled(): boolean {
    return this.#ph.sched.settled;
  }

  get materialSettled(): boolean {
    return this.#iconBlend.done;
  }

  setIcons(
    icons: Readonly<Record<string, string>>,
    spec: Spec = MATERIAL_FADE,
    progress?: (value: number) => void,
  ): void {
    if (!this.#iconBlend.done) {
      this.#pendingIcons = {
        icons,
        spec,
        ...(progress === undefined ? {} : { progress }),
      };
      return;
    }
    this.#previousIcons = this.#icons;
    const themeChanged = Object.entries(icons).some(
      ([id, url]) => /^\d+$/.test(id) && this.#icons[id] !== url,
    );
    this.#icons = { ...(themeChanged ? this.#baseIcons : this.#icons), ...icons };
    this.#iconBlend.snap(0);
    this.#iconBlend.retarget(1, spec);
    this.#materialProgress = progress;
    progress?.(0);
    this.#dirty = true;
  }

  invalidateMaterials(): void {
    this.#pendingIcons = undefined;
  }

  get retainedIconUrls(): readonly string[] {
    return [
      ...Object.values(this.#icons),
      ...Object.values(this.#previousIcons),
      ...Object.values(this.#pendingIcons?.icons ?? {}),
    ];
  }

  iconMaterial(
    id: string,
    icon: number,
  ): { current: string | undefined; previous: string | undefined; blend: number } {
    const key = id.replace(/^outgoing-\d+-/, "").replace(/^parent-/, "");
    const current =
      this.#icons[id] ?? this.#icons[key] ?? this.#icons[icon] ?? this.#baseIcons[icon];
    const previous =
      this.#previousIcons[id] ??
      this.#previousIcons[key] ??
      this.#previousIcons[icon] ??
      current;
    return { current, previous, blend: this.#iconBlend.value };
  }

  get previewAlpha(): number {
    return this.#previewAlpha.value;
  }

  get whatsNewPreview(): boolean {
    return (
      this.content.top === undefined &&
      focused(this.#cats, this.#state)?.id === "whats-new"
    );
  }

  get whatsNewAlpha(): number {
    return this.#whatsNewAlpha.value;
  }

  get panelAlpha(): number {
    return this.#panelAlpha.value;
  }

  get pageAlpha(): number {
    return this.#pageAlpha.value;
  }

  get optionOffset(): number {
    return this.#optionOffset.value;
  }

  get depth(): number {
    return this.#depth.value;
  }

  get about(): AboutRoll | undefined {
    return this.#about;
  }

  setAboutLayout(contentHeight: number, viewportHeight: number): void {
    const key = `${contentHeight}:${viewportHeight}:${String(this.#reduced)}`;
    if (key === this.#aboutLayout) return;
    const previous = this.#about?.frame;
    this.#about = new AboutRoll({
      contentHeight,
      viewportHeight,
      reducedMotion: this.#reduced,
    });
    this.#aboutLayout = key;
    if (previous !== undefined) {
      this.#about.seek(previous.offset);
      if (previous.paused) this.#about.togglePause();
    }
    this.#dirty = true;
  }

  materialSnapshot(): Snapshot {
    const state = this.#state;
    const depth = state.levels.length - 1;
    const current = place(this.#metrics, {
      ...this.#view(state, state.levels.at(-1) ?? 0),
      categoryOffset: state.category,
      depth,
    });
    return { ...current, items: [...current.items, ...this.#parentItems(depth)] };
  }

  #parentItems(depth: number): Snapshot["items"] {
    if (this.#parentState === undefined || depth <= 0) return [];
    const parent = place(this.#metrics, {
      ...this.#view(this.#parentState, this.#parentState.levels.at(-1) ?? 0),
      depth: 0,
    });
    return parent.items.map((item) => ({
      ...item,
      id: `parent-${item.id}`,
      x: item.x - this.#metrics.logical.wid * SUBMENU_PARENT_SHIFT * depth,
      alpha: item.alpha * depth * (item.focused ? 1 : 0.1),
    }));
  }

  #history(): { focus?: State; content?: string; xmp?: boolean } {
    return (globalThis.history.state ?? {}) as {
      focus?: State;
      content?: string;
      xmp?: boolean;
    };
  }

  #route(id: string | undefined): void {
    const path =
      id === "profile" || id === "about"
        ? "/user"
        : id !== undefined && projectOf(id) !== undefined
          ? `/work/${id}`
          : undefined;
    if (id !== undefined && path === undefined) return;
    if (path === undefined) {
      if (appPath() === "/") return;
      if (this.#history().xmp) globalThis.history.back();
      else
        globalThis.history.replaceState(
          { focus: this.#state },
          "",
          `${appUrl("/")}${globalThis.location.search}`,
        );
      return;
    }
    if (appPath() === path) return;
    globalThis.history.replaceState({ ...this.#history(), focus: this.#state }, "");
    globalThis.history.pushState(
      { xmp: true, content: id, focus: this.#state },
      "",
      `${appUrl(path)}${globalThis.location.search}`,
    );
  }

  readonly #restore = (): void => {
    const path = appPath();
    const stored = this.#history();
    let id =
      path === "/user"
        ? "profile"
        : path.startsWith("/work/")
          ? path.slice(6)
          : undefined;
    if (id === undefined && path !== "/") id = "missing";
    const saved = stored.focus;
    if (
      saved !== undefined &&
      this.#cats[saved.category]?.entries[saved.levels[0] ?? -1] !== undefined
    ) {
      this.#apply({ state: saved, effect: "none" });
    } else if (id !== undefined) {
      const locate = (entries: readonly Entry[]): readonly number[] | undefined => {
        for (const [index, entry] of entries.entries()) {
          if (entry.id === id) return [index];
          const child = locate(entry.entries);
          if (child !== undefined) return [index, ...child];
        }
        return undefined;
      };
      for (const [category, item] of this.#cats.entries()) {
        const levels = locate(item.entries);
        if (levels === undefined) continue;
        this.#apply({ state: { category, levels }, effect: "none" });
        break;
      }
    }
    this.content.restore(id);
  };

  selectCategory(id: string): void {
    if (this.content.top !== undefined) return;
    const category = this.#cats.findIndex((cat) => cat.id === id);
    if (category < 0 || category === this.#state.category) return;
    this.#apply({
      state: { category, levels: this.#categoryPositions.get(category) ?? [0] },
      effect: "category",
    });
  }

  selectItem(id: string, activate = false): void {
    if (this.content.top !== undefined) return;
    const index = list(this.#cats, this.#state).findIndex((entry) => entry.id === id);
    if (index < 0) return;
    if (index !== this.#state.levels.at(-1))
      this.#apply({
        state: { ...this.#state, levels: [...this.#state.levels.slice(0, -1), index] },
        effect: "cursor",
      });
    if (activate) this.command("decide");
  }

  get state(): State {
    return this.#state;
  }

  get focusTime(): number {
    return this.#focusTime;
  }

  readonly describe = (): Described => this.#described;

  #describe(): Described {
    const at = this.#state.levels[this.#state.levels.length - 1] ?? 0;
    const cat = this.#cats[this.#state.category];

    return {
      category: cat?.title ?? "",
      depth: this.#state.levels.length - 1,
      categories: this.#cats.map((c, i) => ({
        id: c.id,
        title: c.title,
        focused: i === this.#state.category,
      })),
      items: list(this.#cats, this.#state).map((e, i) => ({
        id: e.id,
        title: e.title,
        info: e.info,
        focused: i === at,
        folder: hasChildren(e),
      })),
    };
  }

  #apply(step: Step): void {
    this.#onEffect(step.effect);

    const sound = SOUND[step.effect];
    if (sound !== undefined) {
      this.#audio.play(sound);
    }

    if (step.state !== this.#state) {
      if (step.state.levels.length > 1)
        this.#parentState = {
          category: step.state.category,
          levels: step.state.levels.slice(0, -1),
        };
      if (step.state.levels.length !== this.#state.levels.length) {
        this.#depth.retarget(step.state.levels.length - 1, LEVEL_PUSH);
        this.#ph.list.snapTo(step.state.levels.at(-1) ?? 0);
      }
      if (step.state.category !== this.#state.category) {
        const outgoing = this.#columns.get(this.#state.category);
        if (outgoing !== undefined) {
          outgoing.state = this.#state;
          outgoing.offset = this.#ph.list.offset;
          outgoing.alpha.retarget(0, CATEGORY_MOVE);
        }
        let incoming = this.#columns.get(step.state.category);
        if (incoming === undefined) {
          incoming = {
            state: step.state,
            offset: step.state.levels[step.state.levels.length - 1] ?? 0,
            alpha: this.#ph.sched.add(0),
          };
          this.#columns.set(step.state.category, incoming);
        }
        incoming.alpha.retarget(1, CATEGORY_MOVE);
      }
      this.#focusTime = 0;
      this.#previewTime = 0;
      this.#preview = undefined;
      this.#previewAlpha.snap(0);
      this.#dirty = true;
      this.#state = step.state;
      this.#categoryPositions.set(step.state.category, step.state.levels);
      this.#ph.sync(
        step.state.category,
        step.state.levels[step.state.levels.length - 1] ?? 0,
      );
      this.#described = this.#describe();
    }
  }

  boardCommand(cmd: BoardCommand): void {
    const effect = this.board.command(cmd);
    if (effect?.kind === "close") this.content.back();
    else if (effect?.kind === "link")
      this.content.open({ kind: "browser", href: effect.href });
    this.#dirty = true;
  }

  command(cmd: Command): void {
    if (this.content.top?.kind === "whats-new") {
      void this.#audio.unlock();
      const before = this.whatsNew.snapshot().selected;
      const effect = this.whatsNew.command(cmd);
      if (effect === "close") this.content.back();
      else if (effect !== undefined) this.content.open(effect);
      else if (before !== this.whatsNew.snapshot().selected)
        this.#apply({ state: this.#state, effect: "cursor" });
      this.#dirty = true;
      return;
    }
    if (this.content.top?.kind === "board") {
      if (cmd !== "l1" && cmd !== "r1") this.boardCommand(cmd);
      return;
    }
    void this.#audio.unlock();

    if (this.content.top?.kind === "about") {
      if (cmd === "cancel" || cmd === "left") this.content.back();
      else if (cmd === "decide") this.#about?.togglePause();
      else if ((cmd === "up" || cmd === "down") && this.#pad.device === "touch") {
        const roll = this.#about;
        if (roll !== undefined)
          roll.seek(roll.frame.offset + (cmd === "down" ? 180 : -180));
      }
      this.#dirty = true;
      return;
    }

    if (this.content.command(cmd)) return;
    const entry = focused(this.#cats, this.#state);
    if (cmd === "options" && entry !== undefined) {
      this.content.options(entry.id);
      return;
    }

    const dir = DIRS[cmd];

    if (dir !== undefined) {
      const step = move(this.#cats, this.#state, dir);
      this.#apply(
        step.state.category === this.#state.category
          ? step
          : {
              ...step,
              state: {
                ...step.state,
                levels:
                  this.#categoryPositions.get(step.state.category) ?? step.state.levels,
              },
            },
      );
      return;
    }

    if (cmd === "decide") {
      if (entry !== undefined && !hasChildren(entry)) {
        const action = actionFor(entry.id);
        if (action !== undefined) {
          this.content.open(action);
          return;
        }
      }
      this.#apply(decide(this.#cats, this.#state));
      return;
    }

    if (cmd === "cancel") {
      this.#apply(cancel(this.#state));
    }
  }

  #view(state = this.#state, offset = this.#ph.list.offset, alpha = 1): View {
    return {
      categories: this.#cats.map((c) => ({
        id: c.id,
        icon: c.icon,
        title: c.title,
        info: "",
      })),
      categoryOffset: this.#ph.bar.offset,
      items: list(this.#cats, state).map((e) => ({
        id: e.id,
        icon: e.icon,
        title: e.title,
        info: e.info,
      })),
      itemOffset: offset,
      depth: this.#depth.value,
      categoryIndex: state.category,
      itemAlpha: alpha,
      mediaFolder:
        this.#cats[state.category]?.id === "works" && state.levels.length > 1,
    };
  }

  #sync(): void {
    const alpha = this.#columns.get(this.#state.category)?.alpha.value ?? 1;
    const current = place(
      this.#metrics,
      this.#view(this.#state, this.#ph.list.offset, alpha),
    );
    const items = [...current.items];
    const labels = [...current.labels];
    items.push(
      ...this.#parentItems(this.#state.levels.length > 1 ? this.#depth.value : 0),
    );
    for (const [category, column] of this.#columns) {
      if (category === this.#state.category) continue;
      if (column.alpha.done) {
        this.#ph.sched.remove(column.alpha);
        this.#columns.delete(category);
        continue;
      }
      const outgoing = place(
        this.#metrics,
        this.#view(column.state, column.offset, column.alpha.value),
      );
      for (const item of outgoing.items)
        items.push({ ...item, id: `outgoing-${category}-${item.id}` });
      for (const label of outgoing.labels)
        labels.push({
          ...label,
          id: `outgoing-${category}-${label.id}`,
          focused: false,
        });
    }
    this.#snap = { ...current, items, labels };

    for (const fn of this.#watchers) {
      fn();
    }
  }

  tick(deltaMs: number, reduced = false, interactive = true): void {
    this.#reduced = reduced;
    this.content.browser.advance(deltaMs, reduced);
    if (this.board.advance(deltaMs, reduced)) this.#dirty = true;
    const welcome = this.whatsNewPreview;
    const welcomeFocus =
      this.content.top?.kind === "whats-new" ||
      (welcome && this.#previewTime >= PREVIEW_DELAY);
    if (welcomeFocus !== this.#whatsNewFocus) {
      this.#whatsNewFocus = welcomeFocus;
      this.#whatsNewAlpha.retarget(welcomeFocus ? 1 : 0, {
        durationMs: WHATS_NEW.focusMs,
        accelMode: AccelMode.Decelerate,
      });
      if (
        !welcomeFocus &&
        !this.content.snapshot().pages.some((page) => page.kind === "whats-new")
      )
        this.whatsNew.close();
    }
    if (welcomeFocus) this.whatsNew.open();
    if (welcome || this.content.top?.kind === "whats-new")
      this.whatsNew.advance(deltaMs, reduced);
    if (interactive && !reduced) this.#focusTime += deltaMs;
    const commands = this.#pad.flush(deltaMs);
    if (commands.length > 0) this.#setDevice(this.#pad.device);
    for (const cmd of commands) {
      if (interactive) this.command(cmd);
    }
    if (this.content.top?.kind === "about" && this.#about !== undefined) {
      const held = this.#pad.held;
      this.#about.direction(held.includes("up") ? -1 : held.includes("down") ? 1 : 0);
      if (this.#about.advance(deltaMs).done) this.content.back();
      this.#dirty = true;
    }

    if (interactive && this.content.top === undefined) {
      this.#previewTime += deltaMs;
      if (this.#preview === undefined && this.#previewTime >= PREVIEW_DELAY) {
        const entry = focused(this.#cats, this.#state);
        const preview =
          entry === undefined ? undefined : projectOf(entry.id)?.images[0]?.src;
        if (preview !== undefined) {
          this.#preview = preview;
          this.#previewAlpha.retarget(1, CATEGORY_MOVE);
          this.#dirty = true;
        }
      }
    }

    const moving = !this.#ph.sched.settled;
    this.#ph.tick(reduced ? 1000 : deltaMs);
    this.#materialProgress?.(this.#iconBlend.value);
    if (this.#iconBlend.done) {
      this.#materialProgress = undefined;
      this.#previousIcons = {};
      const pending = this.#pendingIcons;
      if (pending !== undefined) {
        this.#pendingIcons = undefined;
        this.setIcons(pending.icons, pending.spec, pending.progress);
      }
    }
    if (this.#panelAlpha.done && this.#panelAlpha.value === 0)
      this.content.finishExit();
    if (moving || this.#dirty) {
      this.#sync();
      this.#dirty = false;
    }
  }

  dispose(): void {
    this.#target.removeEventListener("pointerdown", this.#pointer);
    this.#target.removeEventListener("keydown", this.#keyboard);
    globalThis.removeEventListener("popstate", this.#restore);
    this.content.video?.pause();
    this.whatsNew.close();
    this.#audio.dispose();
    this.#pad.dispose();
    this.#watchers.clear();
  }
}
