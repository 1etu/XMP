import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createPresence } from "./presence.ts";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const presence = createPresence();
const mime: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".ico": "image/x-icon",
};
const server = createServer((request, response) => {
  if (presence.handle(request, response)) return;
  void (async () => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://localhost").pathname,
    );
    const target = resolve(root, `.${pathname}`);
    if (!target.startsWith(resolve(root) + sep) && target !== resolve(root)) {
      response.writeHead(403).end();
      return;
    }
    let file = target;
    let info = await stat(file).catch(() => undefined);
    if (info?.isFile() !== true) {
      if (extname(pathname) !== "" || pathname.startsWith("/api/")) {
        response.writeHead(404).end();
        return;
      }
      file = resolve(root, "index.html");
      info = await stat(file);
    }
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range === undefined || range === null ? 0 : Number(range[1]);
    const end = range?.[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
      return;
    }
    const partial = range !== null && range !== undefined;
    response.writeHead(partial ? 206 : 200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
      ...(partial ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(file, { start, end });
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  })().catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});
server.listen(Number(process.env["PORT"] ?? 8080), process.env["HOST"] ?? "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    presence.close();
    server.close();
  });
}
