import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "qgl",
    include: ["src/**/*.test.ts"],
  },
});
