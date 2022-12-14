import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import * as Qrc from "./qrc.ts";

const ARC_HDR_SIZE = 0x40;
