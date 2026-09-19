import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "apps/vsh-web/e2e",
  outputDir: "test-results",
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env["XMP_TEST_URL"] ?? "http://127.0.0.1:4173",
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  webServer: process.env["XMP_TEST_URL"]
    ? undefined
    : {
        command:
          "pnpm --filter vsh-web exec vite preview --port 4173 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: true,
        timeout: 120000,
      },
});
