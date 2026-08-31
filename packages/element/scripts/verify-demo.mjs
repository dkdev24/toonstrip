// One-off verification for M3's exit criteria: live column-count resize and
// an axe-core a11y pass against the plain-HTML demo page, in a real browser.
// Not wired into `pnpm test` (no browser install step in CI yet — see
// NOTES.md "M3"). Run manually: node packages/element/scripts/verify-demo.mjs
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axeSource = require.resolve("axe-core/axe.min.js");

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:8934";

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  console.log(`[console:${msg.type()}]`, msg.text());
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => {
  console.log("[pageerror]", String(err));
  consoleErrors.push(String(err));
});
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));

await page.setViewportSize({ width: 1200, height: 900 });
await page.goto(`${BASE}/packages/element/demo/index.html`);

// Wait for the pack to load and panels to be created.
await page.waitForFunction(
  () => document.querySelector("comic-strip")?.shadowRoot?.querySelectorAll("canvas").length === 4,
  { timeout: 10_000 },
);

async function columnsAt(width) {
  await page.setViewportSize({ width, height: 900 });
  // Let the ResizeObserver callback run (it fires on a microtask/rAF-ish schedule).
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const el = document.querySelector("comic-strip");
    const style = getComputedStyle(el.shadowRoot.querySelector(".strip"));
    const cols = style.gridTemplateColumns.trim().split(/\s+/).length;
    return { reportedColumns: el.columns, gridColumns: cols };
  });
}

// Breakpoints per layoutStrip's policy (UNIT.width=400, MIN_PANEL_SCALE=0.85,
// gutter=10): a column needs ~350px of share, so 3 columns need >=1050,
// 2 columns need >=700 (minus the host's own 32px padding + body's own
// max-width/margins — set viewport wide enough that the host's content box
// clears each threshold).
const wide = await columnsAt(1200);
const mid = await columnsAt(820);
const veryNarrow = await columnsAt(400);

console.log("wide (1200px):", wide);
console.log("mid (820px):", mid);
console.log("veryNarrow (400px):", veryNarrow);

const canvasesNonBlank = await page.evaluate(() => {
  const el = document.querySelector("comic-strip");
  const canvases = [...el.shadowRoot.querySelectorAll("canvas")];
  return canvases.map((c) => ({
    width: c.width,
    height: c.height,
    role: c.getAttribute("role"),
    ariaLabel: c.getAttribute("aria-label"),
  }));
});
console.log("canvases:", JSON.stringify(canvasesNonBlank, null, 2));

// axe-core a11y check
await page.addScriptTag({ path: axeSource });
const axeResults = await page.evaluate(async () => {
  // @ts-expect-error injected global
  return await window.axe.run();
});
console.log("axe violations:", axeResults.violations.length);
for (const v of axeResults.violations) {
  console.log(` - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`);
}

console.log("console errors during run:", consoleErrors);

await browser.close();

const ok =
  wide.reportedColumns === 3 &&
  mid.reportedColumns === 2 &&
  veryNarrow.reportedColumns === 1 &&
  axeResults.violations.length === 0 &&
  consoleErrors.length === 0;

console.log(ok ? "\nPASS" : "\nFAIL");
process.exit(ok ? 0 : 1);
