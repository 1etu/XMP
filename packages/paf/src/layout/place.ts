import { measured, verified } from "@vsh/resource";

import { OFFSCREEN, clamp01, lerp, nearness, spread } from "./curve.js";
import type { Metrics } from "./metrics.js";
import type { Label, Slot, Snapshot, View } from "./slot.js";

export const SUBMENU_PARENT_SHIFT = measured(0.13671875);

const SUBMENU_GAP = measured(0.1833333333);
const SUBMENU_ICON_SHIFT = measured(0.00625);
const SUBMENU_ICON_SCALE = measured(0.44);
const SUBMENU_LABEL_X = measured(0.3385416667);
const SUBMENU_DIM = verified(0.1);
const MEDIA_ICON_X = measured(0.3375);
const MEDIA_LABEL_X = measured(0.443);

const FOCUS_EDGE = 0.5;

export function place(metrics: Metrics, view: View): Snapshot {
  const { logical: lg, frac: fr, design: dz } = metrics;

  const focusX = fr.focusX * lg.wid;
  const catPitch = fr.categoryPitchX * lg.wid;
  const catGap = (fr.categoryFocusGapX ?? fr.categoryPitchX) * lg.wid;
  const catIconY = fr.categoryIconY * lg.hgt;
  const catSize = dz.categoryIconSize * lg.hgt;

  const itemY = fr.focusItemY * lg.hgt;
  const itemPitch = fr.itemPitchY * lg.hgt;
  const itemGap = fr.focusGapY * lg.hgt;
  const itemGapUp = fr.focusGapAboveY * lg.hgt;
  const focusSize = fr.focusIconSize * lg.hgt;

  const depth = clamp01(view.depth);
  const railFade = 1 - depth;

  const categories: Slot[] = [];

  view.categories.forEach((c, i) => {
    const d = i - view.categoryOffset;
    const x = focusX + spread(d, catGap, catPitch);

    if (x < -catSize || x > lg.wid + catSize) {
      return;
    }

    const near = nearness(d);

    categories.push({
      id: c.id,
      icon: c.icon,
      x: x - SUBMENU_PARENT_SHIFT * lg.wid * depth * near,
      y: catIconY - (fr.categoryFocusRiseY ?? 0) * lg.hgt * near,
      size: catSize * lerp(dz.categoryOtherIconScale ?? dz.otherIconScale, 1, near),
      alpha:
        lerp(dz.railAlpha, dz.focusAlpha, near) *
        (1 - depth * (1 - SUBMENU_DIM) * (1 - near)),
      focused: near > FOCUS_EDGE,
    });
  });

  const categoryLabels = categories.flatMap((c): Label[] => {
    const index = view.categories.findIndex((item) => item.id === c.id);
    const item = view.categories[index];
    const near = nearness(index - view.categoryOffset);

    if (near <= 0 || item === undefined) {
      return [];
    }

    return [
      {
        id: c.id,
        text: item.title,
        info: "",
        x: c.x,
        y: fr.categoryLabelY * lg.hgt,
        scale: dz.focusLabelScale,
        alpha: near * railFade,
        focused: true,
      },
    ];
  });

  const categoryLabel =
    categoryLabels.find((label) => label.alpha >= FOCUS_EDGE) ?? categoryLabels[0];

  const columnX =
    view.categoryIndex === undefined
      ? 0
      : spread(view.categoryIndex - view.categoryOffset, catGap, catPitch);
  const columnAlpha = view.itemAlpha ?? 1;
  const media = view.mediaFolder === true;

  const items: Slot[] = [];
  const labels: Label[] = [];

  view.items.forEach((it, i) => {
    const d = i - view.itemOffset;
    const y =
      itemY +
      spread(
        d,
        lerp(itemGap, lg.hgt * SUBMENU_GAP, depth),
        itemPitch,
        lerp(itemGapUp, lg.hgt * SUBMENU_GAP, depth),
      );

    if (y < -focusSize * OFFSCREEN || y > lg.hgt + focusSize * OFFSCREEN) {
      return;
    }

    const near = nearness(d);

    items.push({
      id: it.id,
      icon: it.icon,
      x:
        lerp(
          focusX,
          media ? lg.wid * MEDIA_ICON_X : focusX + lg.wid * SUBMENU_ICON_SHIFT,
          depth,
        ) + columnX,
      y,
      size:
        focusSize *
        lerp(dz.otherIconScale, 1, near) *
        lerp(1, media ? 1 : SUBMENU_ICON_SCALE, depth),
      alpha:
        lerp(dz.otherIconAlpha ?? dz.otherAlpha, dz.focusAlpha, near) * columnAlpha,
      focused: near > FOCUS_EDGE,
    });

    labels.push({
      id: it.id,
      text: it.title,
      info: near > FOCUS_EDGE ? it.info : "",
      x:
        (lerp(fr.itemLabelX, media ? MEDIA_LABEL_X : SUBMENU_LABEL_X, depth) +
          (fr.otherLabelOffsetX ?? 0) * (1 - near)) *
          lg.wid +
        columnX,
      y:
        y +
        (d < 0 ? (fr.aboveLabelOffsetY ?? 0) : (fr.otherLabelOffsetY ?? 0)) *
          lg.hgt *
          (1 - near),
      scale: lerp(dz.otherLabelScale, dz.focusLabelScale, near),
      alpha: lerp(dz.otherAlpha, dz.focusAlpha, near) * columnAlpha,
      focused: near > FOCUS_EDGE,
    });
  });

  return { categories, categoryLabel, categoryLabels, items, labels };
}
