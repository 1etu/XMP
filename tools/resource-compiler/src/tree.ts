import * as Xmbml from "./xmbml.ts";

const ROOT_VIEW = "root";
const MAX_DEPTH = 4;
const KEY_ICON = "icon_rsc";
const KEY_TITLE = "title_rsc";
const KEY_INFO = "info_rsc";
const KEY_CHILD = "child";
const KEY_POS = "ch_pos";
const KEY_ACTION = "bar_action";
const ACT_NONE = "none";

export interface Item {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly info: string;
  readonly action: string;
  readonly childPos: number;
  readonly items: readonly Item[];
}

export interface Category {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly items: readonly Item[];
}

export interface Provided {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly info?: string;
}

export interface Meta {
  readonly icon: string;
  readonly title: string;
  readonly xml: string;
  readonly railOnly?: boolean;
}

export interface Spec {
  readonly order: readonly string[];
  readonly categories: Readonly<Record<string, Meta>>;
  readonly providers: Readonly<Record<string, readonly Provided[]>>;
  readonly attrs: Readonly<Record<string, Provided>>;
  readonly drop: readonly string[];
}

export class BuildError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "TreeBuildError";
    this.detail = detail;
  }
}

export class Atlas {
  readonly #slots: Readonly<Record<string, number>>;
  readonly #seen = new Set<string>();

  constructor(slots: Readonly<Record<string, number>>) {
    this.#slots = slots;
  }

  of(name: string): number {
    const slot = this.#slots[name];
    if (slot === undefined) {
      throw new BuildError(`no atlas slot for ${name}`);
    }
    this.#seen.add(name);
    return slot;
  }

  unused(): string[] {
    return Object.keys(this.#slots)
      .filter((k) => !this.#seen.has(k))
      .sort();
  }
}

function itemOf(
  key: string,
  table: Xmbml.Table,
  kids: readonly Item[],
  atlas: Atlas,
): Item {
  const icon = table[KEY_ICON];

  return {
    id: key,
    icon: icon === undefined ? 0 : atlas.of(icon),
    title: table[KEY_TITLE] ?? "",
    info: table[KEY_INFO] ?? "",
    action: table[KEY_ACTION] ?? ACT_NONE,
    childPos: Number(table[KEY_POS] ?? 0),
    items: kids,
  };
}

function collect(
  views: Map<string, Xmbml.View>,
  id: string,
  depth: number,
  spec: Spec,
  atlas: Atlas,
  seen: ReadonlySet<string>,
): Item[] {
  const view = views.get(id);
  if (view === undefined || depth > MAX_DEPTH || seen.has(id)) {
    return [];
  }

  const mark = new Set(seen);
  mark.add(id);

  const out: Item[] = [];

  for (const entry of view.items) {
    if (spec.drop.includes(entry.key)) {
      continue;
    }

    const fixed = spec.attrs[entry.key];
    const table =
      view.tables[entry.attr] ??
      (fixed === undefined
        ? {}
        : { [KEY_ICON]: fixed.icon, [KEY_TITLE]: fixed.title, [KEY_INFO]: fixed.info ?? "" });

    if (!entry.query) {
      out.push(itemOf(entry.key, table, [], atlas));
      continue;
    }

    const provided = spec.providers[entry.src];
    if (provided !== undefined) {
      for (const p of provided) {
        out.push(
          itemOf(
            p.id,
            { [KEY_ICON]: p.icon, [KEY_TITLE]: p.title, [KEY_INFO]: p.info ?? "" },
            [],
            atlas,
          ),
        );
      }
      continue;
    }

    const kids = collect(views, entry.src, depth + 1, spec, atlas, mark);

    if (table[KEY_TITLE] === undefined) {
      out.push(...kids);
      continue;
    }

    if (table[KEY_CHILD] !== undefined && kids.length === 0) {
      throw new BuildError(`${entry.key} declares ${KEY_CHILD} but resolved to nothing`);
    }

    out.push(itemOf(entry.key, table, kids, atlas));
  }

  return out;
}

export function build(
  spec: Spec,
  atlas: Atlas,
  read: (xml: string) => string,
): Category[] {
  return spec.order.map((id) => {
    const meta = spec.categories[id];
    if (meta === undefined) {
      throw new BuildError(`${id} is in order but has no definition`);
    }

    const items =
      meta.railOnly === true
        ? []
        : collect(Xmbml.views(read(meta.xml)), ROOT_VIEW, 0, spec, atlas, new Set());

    return { id, icon: atlas.of(meta.icon), title: meta.title, items };
  });
}
