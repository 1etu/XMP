import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    name: "portfolio-runtime",
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
  },
});
