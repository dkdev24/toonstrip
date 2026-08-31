import { chromium } from "playwright";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:4790";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

const requestedUrls = [];
page.on("request", (req) => requestedUrls.push(req.url()));
page.on("console", (msg) => console.log("CONSOLE", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
page.on("requestfailed", (req) => console.log("REQFAILED", req.url(), req.failure()?.errorText));

await page.goto(`${BASE}/blog/comic-strips-in-astro/`, { waitUntil: "load", timeout: 15000 });
await page.waitForTimeout(500);

const elementModuleRequested = () => requestedUrls.some((u) => u.includes("packages/element") || u.includes("@toonstrip/element"));

const before = {
  elementModuleRequested: elementModuleRequested(),
  canvasCount: await page.evaluate(() => document.querySelector("comic-strip")?.shadowRoot?.querySelectorAll("canvas").length ?? 0),
};
console.log("BEFORE SCROLL:", JSON.stringify(before));

await page.evaluate(() => document.querySelector("comic-strip")?.scrollIntoView());
await page.waitForFunction(
  () => (document.querySelector("comic-strip")?.shadowRoot?.querySelectorAll("canvas").length ?? 0) > 0,
  { timeout: 10000 },
);
await page.waitForTimeout(500);

const after = {
  elementModuleRequested: elementModuleRequested(),
  canvasCount: await page.evaluate(() => document.querySelector("comic-strip")?.shadowRoot?.querySelectorAll("canvas").length ?? 0),
};
console.log("AFTER SCROLL:", JSON.stringify(after));

await browser.close();

if (before.elementModuleRequested || before.canvasCount > 0) {
  console.error("FAIL: comic-strip rendered/loaded before scrolling into view");
  process.exit(1);
}
if (!after.elementModuleRequested || after.canvasCount === 0) {
  console.error("FAIL: comic-strip never rendered after scrolling into view");
  process.exit(1);
}
console.log("PASS: client:visible deferred @toonstrip/element load and render until intersection");
