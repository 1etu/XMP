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
