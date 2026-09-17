import { describe, expect, it, vi } from "vitest";
import { WHATS_NEW, WhatsNew } from "./whats-new.js";
import type { WhatsNewItem } from "@vsh/content";

const items: readonly WhatsNewItem[] = Array.from({ length: 8 }, (_, index) => ({
  id: String(index),
  title: `Item ${index}`,
  image: `/image-${index}.png`,
  artwork: false,
  type: "web",
  action: { kind: "browser", href: `https://example.com/${index}` },
}));