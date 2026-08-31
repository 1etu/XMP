import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createPresence } from "./presence.ts";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const presence = createPresence();