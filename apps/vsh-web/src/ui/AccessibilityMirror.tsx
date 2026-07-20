import { useSyncExternalStore } from "react";

import type { Described, XmbShell } from "../runtime/shell.js";

const EMPTY: Described = { category: "", depth: 0, categories: [], items: [] };

export function AccessibilityMirror({ shell }: { shell: XmbShell }): React.JSX.Element {
  const view = useSyncExternalStore(shell.subscribe, shell.describe, () => EMPTY);

  return (
    <nav className="vsh-mirror" aria-label="XrossMediaBar">
      <ul aria-label="Categories">
        {view.categories.map((c) => (
          <li key={c.id} aria-current={c.focused ? "true" : undefined}>
            {c.title}
          </li>
        ))}
      </ul>

      <ul aria-label={view.category}>
        {view.items.map((i) => (
          <li key={i.id} aria-current={i.focused ? "true" : undefined}>
            {i.title}
            {i.info === "" ? null : <span>. {i.info}</span>}
            {i.folder ? <span>. Has a submenu.</span> : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
