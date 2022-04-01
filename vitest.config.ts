import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "tools/*", "apps/vsh-web"],
  },
});
