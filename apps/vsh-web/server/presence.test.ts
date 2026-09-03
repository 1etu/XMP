import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createPresence } from "./presence.ts";

let service: ReturnType<typeof createPresence>;
let server: ReturnType<typeof createServer>;
let base: string;
const streams: ReadableStreamDefaultReader<Uint8Array>[] = [];

beforeEach(async () => {
  service = createPresence();
  server = createServer((request, response) => {
    if (!service.handle(request, response)) response.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing port");
  base = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  for (const reader of streams.splice(0)) await reader.cancel();
  service.close();
  server.close();
  server.closeAllConnections();
  await once(server, "close");
});

async function connect(id: string) {
  const response = await fetch(`${base}/api/presence?visitor=${id}`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/event-stream");
  const reader = response.body?.getReader();
  if (reader === undefined) throw new Error("Missing event stream");
  streams.push(reader);
  return reader;
}
