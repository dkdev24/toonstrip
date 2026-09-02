import { defineConfig, devices } from "@playwright/test";

/**
 * Site e2e (SITE_DEV_PLAN.md §11). Runs against `astro preview` of a built
 * site. `PLAYWRIGHT_CHROMIUM_PATH` points at an existing Chromium when
 * Playwright's own download is blocked (NOTES.md "M7 S0").
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.SITE_URL ?? "http://localhost:4321",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec astro preview --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
