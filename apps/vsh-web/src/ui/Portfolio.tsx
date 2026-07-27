import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  informationOf,
  optionsFor,
  profile,
  projectOf,
  SETTING_LABELS,
} from "@vsh/content";
import { CHOICES } from "../runtime/presentation.js";
import type { Page } from "../runtime/presentation.js";
import type { XmbShell } from "../runtime/shell.js";
import { ControlGlyph } from "./ControlGlyph.js";
import { About } from "./About.js";
import { SystemInformation } from "./SystemInformation.js";
import { Profile } from "./Profile.js";
import { WebView } from "./WebView.js";
import { InformationBoard, BoardTicker } from "./InformationBoard.js";
import { WhatsNew, WhatsNewPreview } from "./WhatsNew.js";
import "./settings.css";

function UserBadge(): React.JSX.Element {
  return (
    <div className="vsh-user-badge" aria-label={`User: ${profile.handle}`}>
      <div className="vsh-user-badge-face">
        <img src={profile.avatar} alt="" />
        <span>{profile.handle}</span>
      </div>
    </div>
  );
}
