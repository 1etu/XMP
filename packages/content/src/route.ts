import { isChoiceId } from "./action.js";
import type { ContentAction } from "./action.js";
import { informationOf } from "./information.js";
import { profile } from "./project.js";

const FIXED: Readonly<Record<string, ContentAction>> = {
  "whats-new": { kind: "whats-new" },
  "information-board": { kind: "board" },
  "internet-browser": { kind: "browser" },
  "about-site": { kind: "about" },
  "system-information": { kind: "system" },
  profile: { kind: "profile" },
};

export function actionFor(id: string): ContentAction | undefined {
  const fixed = FIXED[id];
  if (fixed !== undefined) {
    return fixed;
  }

  if (informationOf(id) !== undefined) {
    return { kind: "information", id };
  }
  if (isChoiceId(id)) {
    return { kind: "choice", setting: id };
  }
  if (id === "github") {
    return { kind: "link", href: profile.github };
  }
  if (id === "website") {
    return { kind: "link", href: profile.website };
  }

  return undefined;
}
