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

function originals(dir: string): Plugin {
  return {
    name: "vsh-originals",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(ORIGINAL)) {
          next();
          return;
        }

        const rel = normalize(decodeURIComponent(url.slice(ORIGINAL.length))).replace(
          /^(\.\.[/\\])+/,
          "",
        );
        const path = join(dir, rel);

        if (!path.startsWith(dir)) {
          res.statusCode = 403;
          res.end();
          return;
        }

        try {
          if (!statSync(path).isFile()) {
            throw new Error("not a file");
          }
        } catch {
          res.statusCode = 404;
          res.end();
          return;
        }

        res.setHeader(
          "content-type",
          TYPES[extname(path).toLowerCase()] ?? "application/octet-stream",
        );
        res.setHeader("cache-control", "no-cache");
        createReadStream(path).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    originals(resolve(import.meta.dirname, "../../assets/original")),
    {
      name: "vsh-presence",
      configureServer(server) {
        const presence = createPresence();
        server.middlewares.use((request, response, next) => {
          if (!presence.handle(request, response)) next();
        });
        server.httpServer?.once("close", presence.close);
      },
      configurePreviewServer(server) {
        const presence = createPresence();
        server.middlewares.use((request, response, next) => {
          if (!presence.handle(request, response)) next();
        });
        server.httpServer.once("close", presence.close);
      },
    },
  ],
  publicDir: resolve(import.meta.dirname, "../../resources"),
  build: {
    target: "es2022",
  },
});
