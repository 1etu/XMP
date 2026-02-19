import type { IncomingMessage, ServerResponse } from "node:http";

const KEEPALIVE = { ms: 15_000, classification: "PROJECT" } as const;
const MAX_CONNECTIONS = 2048;
