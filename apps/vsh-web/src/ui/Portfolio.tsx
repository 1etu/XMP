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

function Information({
  id,
  shell,
}: {
  id: string;
  shell: XmbShell;
}): React.JSX.Element | null {
  const info = informationOf(id);
  if (info === undefined) return null;
  return (
    <section className="vsh-information" aria-label={`${info.title} information`}>
      <UserBadge />
      {info.icon === "" ? null : (
        <img className="vsh-info-art" src={info.icon} alt="" />
      )}
      <div
        className="vsh-info-fields"
        data-native-input="true"
        tabIndex={0}
        ref={(element) => {
          shell.content.scroll = element;
        }}
      >
        <dl>
          <div>
            <dt>Title</dt>
            <dd>
              <h1 tabIndex={-1} data-focus-default>
                {info.title}
              </h1>
            </dd>
          </div>
          {info.rows.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>Description</dt>
            <dd>{info.subtitle}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
