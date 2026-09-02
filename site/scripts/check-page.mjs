// Usage: node scripts/check-page.mjs <path> [--width 1200] [--dark] [--shot out.png] [--at <selector>]
// Note: a full-page shot shows off-screen panels as black boxes (the element releases
// them, by design); use --at to see a strip painted.
// Loads a route from a running preview/dev server (default http://localhost:4321),
// reports canvas count, aria-labels, console/page errors, and axe violations.
// Honours PLAYWRIGHT_CHROMIUM_PATH when Playwright's own browser download is
// blocked (NOTES.md "M7 S0").
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const args = process.argv.slice(2);
const route = args.find((a) => !a.startsWith("--")) ?? "/";
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const width = Number(opt("width", 1200));
const dark = args.includes("--dark");
const shot = opt("shot", null);
const at = opt("at", null); // CSS selector: scroll it into view and shoot the viewport only
const base = process.env.SITE_URL ?? "http://localhost:4321";

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
if (dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
await page.goto(base + route, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
// The element paints a panel only when it nears the viewport, and client:visible
// islands hydrate the same way, so walk the page before measuring anything.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 150));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(800);
const canvases = await page.locator("comic-strip canvas").count();
const labels = await page.locator("comic-strip [role=img]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
const axe = await new AxeBuilder({ page }).analyze();
const violations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.[0], detail: args.includes("--verbose") ? v.nodes[0]?.any?.[0]?.message : undefined }));
if (shot && at) {
  await page.locator(at).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot, fullPage: false });
} else if (shot) await page.screenshot({ path: shot, fullPage: true });
console.log(JSON.stringify({ route, width, dark, canvases, labels, errors, violations }, null, 1));
await browser.close();
process.exit(errors.length || violations.length ? 1 : 0);
