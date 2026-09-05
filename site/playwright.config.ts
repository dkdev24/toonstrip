import { defineConfig, devices } from "@playwright/test";

/**
 * Site e2e (SITE_DEV_PLAN.md §11). Runs against `astro preview` of a built
 * site. `PLAYWRIGHT_CHROMIUM_PATH` points at an existing Chromium when
 * Playwright's own download is blocked (NOTES.md "M7 S0"). Port 4321 is
 * Astro's own default dev port, so `reuseExistingServer` would silently
 * attach to an unrelated project's server left running on it; 4321 is
 * `toonstrip`'s repo-specific port, not shared with any other project.
 */
const PORT = 43210;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.SITE_URL ?? `http://localhost:${PORT}`,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm exec astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
