import type { IncomingMessage, ServerResponse } from "node:http";

const KEEPALIVE = { ms: 15_000, classification: "PROJECT" } as const;
const MAX_CONNECTIONS = 2048;

export function createPresence(): {
  handle: (request: IncomingMessage, response: ServerResponse) => boolean;
  close: () => void;
} {
  const clients = new Map<ServerResponse, string>();
  let timer: ReturnType<typeof setInterval> | undefined;
  const broadcast = (): void => {
    const count = new Set(clients.values()).size;
    const message = `data: ${JSON.stringify({ count })}\n\n`;
    for (const response of clients.keys()) {
      if (!response.write(message)) response.destroy();
    }
  };
  return {
    handle(request, response) {
      const url = URL.parse(request.url ?? "/", "http://localhost");
      if (url === null) {
        response.writeHead(400).end();
        return true;
      }
      if (url.pathname !== "/api/presence") return false;
      const visitor = url.searchParams.get("visitor") ?? "";
      if (request.method !== "GET" || !/^[a-f0-9-]{36}$/i.test(visitor)) {
        response.writeHead(400).end();
        return true;
      }
      if (request.headers["sec-fetch-site"] === "cross-site") {
        response.writeHead(403).end();
        return true;
      }
      if (clients.size >= MAX_CONNECTIONS) {
        response.writeHead(503, { "Retry-After": "30" }).end();
        return true;
      }
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      });
      response.flushHeaders();
      clients.set(response, visitor);
      response.on("close", () => {
        clients.delete(response);
        if (clients.size === 0) {
          clearInterval(timer);
          timer = undefined;
        } else broadcast();
      });
      if (timer === undefined) {
        timer = setInterval(() => {
          for (const client of clients.keys()) {
            if (!client.write(": keepalive\n\n")) client.destroy();
          }
        }, KEEPALIVE.ms);
        timer.unref();
      }
      broadcast();
      return true;
    },
    close() {
      clearInterval(timer);
      timer = undefined;
      const connections = [...clients.keys()];
      clients.clear();
      for (const response of connections) response.end();
    },
  };
}
