import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createPresence } from "./presence.ts";

let service: ReturnType<typeof createPresence>;
let server: ReturnType<typeof createServer>;
let base: string;