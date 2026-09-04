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

async function count(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expected: number,
) {
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) throw new Error("Event stream ended before the count changed");
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    if (lines.includes(`data: {"count":${expected}}`)) return;
  }
}

it("counts browsers once across tabs and updates after the last tab leaves", async () => {
  const visitor = randomUUID();
  const first = await connect(visitor);
  await count(first, 1);
  const duplicate = await connect(visitor);
  await count(duplicate, 1);
  const second = await connect(randomUUID());
  await count(second, 2);
  await count(first, 2);
  await duplicate.cancel();
  await count(first, 2);
  await second.cancel();
  await count(first, 1);
});

it("rejects invalid visitors and cross-site subscriptions", async () => {
  expect((await fetch(`${base}/api/presence?visitor=invalid`)).status).toBe(400);
  expect(
    (
      await fetch(`${base}/api/presence?visitor=${randomUUID()}`, {
        headers: { "Sec-Fetch-Site": "cross-site" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(`${base}/api/presence?visitor=${randomUUID()}`, {
        method: "POST",
      })
    ).status,
  ).toBe(400);
  expect((await fetch(`${base}/other`)).status).toBe(404);
});
