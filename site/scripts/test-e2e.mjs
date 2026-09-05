// Runs the Playwright e2e suite against a dedicated `astro preview` daemon.
//
// `astro preview` (Astro 7) always forks a detached background server and
// exits immediately, so Playwright's own `webServer.command` can't track it
// as a foreground process (it reports "exited early"). This script starts
// the daemon itself, waits for it to answer, then runs Playwright with
// `reuseExistingServer: true` in playwright.config.ts seeing it already up —
// so Playwright never tries to spawn `command` at all.
import { execFileSync, spawnSync } from "node:child_process";

const PORT = 43210;
const siteUrl = `http://localhost:${PORT}/`;
const siteDir = new URL("..", import.meta.url);

function run(args) {
  return execFileSync("pnpm", ["exec", "astro", ...args], { cwd: siteDir, encoding: "utf-8" });
}

async function waitForUp(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(siteUrl);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`astro preview never answered at ${siteUrl}`);
}

run(["preview", "--port", String(PORT), "--background"]);
await waitForUp();

const result = spawnSync("pnpm", ["exec", "playwright", "test"], { stdio: "inherit", cwd: siteDir });

try {
  run(["preview", "stop"]);
} catch {
  // Best-effort cleanup; a failed stop shouldn't mask the test result.
}

process.exit(result.status ?? 1);
