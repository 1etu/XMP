import { useEffect, useState } from "react";
import packageInfo from "../../package.json";
import type { XmbShell } from "../runtime/shell.js";
import "./system-information.css";

function bytes(value: number): string {
  const unit = value >= 1024 ** 3 ? "GB" : value >= 1024 ** 2 ? "MB" : "KB";
  const divisor = unit === "GB" ? 1024 ** 3 : unit === "MB" ? 1024 ** 2 : 1024;
  return `${(value / divisor).toFixed(1)} ${unit}`;
}
