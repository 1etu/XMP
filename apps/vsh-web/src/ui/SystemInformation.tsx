import { appUrl } from "../runtime/path.js";
import { useEffect, useState } from "react";
import packageInfo from "../../package.json";
import type { XmbShell } from "../runtime/shell.js";
import "./system-information.css";

function bytes(value: number): string {
  const unit = value >= 1024 ** 3 ? "GB" : value >= 1024 ** 2 ? "MB" : "KB";
  const divisor = unit === "GB" ? 1024 ** 3 : unit === "MB" ? 1024 ** 2 : 1024;
  return `${(value / divisor).toFixed(1)} ${unit}`;
}

export function SystemInformation({ shell }: { shell: XmbShell }): React.JSX.Element {
  const [storage, setStorage] = useState("Unavailable");
  const [resolution, setResolution] = useState(() => `${innerWidth} × ${innerHeight}`);
  useEffect(() => {
    let active = true;
    if ("storage" in navigator && typeof navigator.storage.estimate === "function") {
      void navigator.storage
        .estimate()
        .then((estimate) => {
          if (active && estimate.usage !== undefined && estimate.quota !== undefined)
            setStorage(`${bytes(estimate.usage)} / ${bytes(estimate.quota)}`);
        })
        .catch(() => undefined);
    }
    const resize = (): void => {
      setResolution(`${innerWidth} × ${innerHeight}`);
    };
    globalThis.addEventListener("resize", resize);
    return () => {
      active = false;
      globalThis.removeEventListener("resize", resize);
    };
  }, []);
  const graphics =
    document.querySelector<HTMLElement>(".vsh-canvas")?.dataset["backend"];
  const rows = [
    ["System Software", `XMP ${packageInfo.version}`],
    [
      "Graphics",
      graphics === "webgpu"
        ? "WebGPU"
        : graphics === "webgl"
          ? "WebGL 2"
          : "Basic display",
    ],
    ["Resolution", resolution],
    ["Site Storage", storage],
  ];
  return (
    <section
      className="vsh-information vsh-system-information"
      aria-labelledby="vsh-system-title"
    >
      <h1
        id="vsh-system-title"
        className="vsh-system-title"
        tabIndex={-1}
        data-focus-default
      >
        <span
          className="vsh-system-icon"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${shell.iconMaterial("system-information", 13).current ?? appUrl("/portfolio/system.svg")})`,
          }}
        />
        System Information
      </h1>
      <dl className="vsh-system-fields">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
