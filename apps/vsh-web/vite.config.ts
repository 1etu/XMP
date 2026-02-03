import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { createPresence } from "./server/presence.ts";

const ORIGINAL = "/original/";
const TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".wav": "audio/wav",
  ".ttf": "font/ttf",
};
