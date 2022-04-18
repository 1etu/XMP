import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "resource-compiler",
    include: ["src/**/*.test.ts"],
  },
});
