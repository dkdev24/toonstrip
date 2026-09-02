import { test, expect, type Page } from "@playwright/test";

const strip = (page: Page) => page.locator("comic-strip canvas");
const jsonPane = (page: Page) => page.locator(".pg-editor .cm-content");

async function readJson(page: Page): Promise<unknown> {
  const text = await jsonPane(page).innerText();
  return JSON.parse(text);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("loads the first preset and renders it", async ({ page }) => {
  await page.goto("/playground/");
  await expect(strip(page)).toHaveCount(3);
  await expect(page.getByRole("status").filter({ hasText: "Valid" })).toBeVisible();
});

test("form edit → JSON → preview stays in sync", async ({ page }) => {
  await page.goto("/playground/");
  await expect(strip(page)).toHaveCount(3);
  await page.getByRole("button", { name: "+ Add panel" }).click();
  await expect(strip(page)).toHaveCount(4);
  const doc = (await readJson(page)) as { panels: unknown[] };
  expect(doc.panels).toHaveLength(4);
});

test("JSON edit updates the form and preview; invalid JSON keeps the last valid strip", async ({ page }) => {
  await page.goto("/playground/");
  await expect(strip(page)).toHaveCount(3);
  const editor = jsonPane(page);
  await editor.click();
  await page.keyboard.press("Control+A");
  const doc = {
    version: 1,
    panels: [{ backdrop: "field", bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.5 } }], speakers: [{ speaker: "dan", balloon: "speech", text: "From the editor." }] }],
  };
  await page.keyboard.insertText(JSON.stringify(doc, null, 2));
  await expect(strip(page)).toHaveCount(1);
  await expect(page.locator(".pg-panels .pg-panel")).toHaveCount(1);
  // Break it.
  await page.keyboard.press("End");
  await page.keyboard.insertText("garbage");
  await expect(page.locator(".pg-status.is-invalid")).toBeVisible();
  await expect(strip(page)).toHaveCount(1); // last valid document survives
});

test("share link round-trips the document through the URL hash", async ({ page }) => {
  await page.goto("/playground/");
  await expect(strip(page)).toHaveCount(3);
  await page.getByRole("button", { name: "+ Add panel" }).click();
  await expect(strip(page)).toHaveCount(4);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("/playground/#d=");
  await page.goto(url);
  await expect(strip(page)).toHaveCount(4);
});

test("keyboard-only: build a two-panel, two-character strip with a caption and a thought balloon", async ({ page }) => {
  await page.goto("/playground/#d=" + encodeURIComponent(""));
  await page.goto("/playground/");
  await expect(strip(page)).toHaveCount(3);
  // Reset to a one-panel document via the editor, then drive the form by keyboard.
  await jsonPane(page).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(JSON.stringify({ version: 1, panels: [{ backdrop: "field", bodies: [], speakers: [] }] }));
  await expect(strip(page)).toHaveCount(1);

  const addCharacter = page.getByRole("button", { name: "+ Add character" });
  await addCharacter.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /^dan/ }).first().focus();
  await page.keyboard.press("Enter");
  await addCharacter.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /^anna/ }).first().focus();
  await page.keyboard.press("Enter");

  // Emotion wheel by keyboard: SAD for anna.
  const wheels = page.getByRole("slider", { name: "Emotion" });
  await wheels.nth(1).focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowLeft"); // 8 × π/8 = π
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(wheels.nth(1)).toHaveAttribute("aria-valuetext", /SAD/);

  await page.getByRole("button", { name: "+ Add caption" }).focus();
  await page.keyboard.press("Enter");
  await page.locator(".pg-line textarea").last().fill("A caption.");
  await page.getByRole("button", { name: "+ Add line" }).focus();
  await page.keyboard.press("Enter");
  const balloon = page.locator(".pg-line select").last();
  await balloon.selectOption("thought");
  await page.locator(".pg-line textarea").last().fill("A thought.");

  await page.getByRole("button", { name: "Duplicate" }).focus();
  await page.keyboard.press("Enter");
  await expect(strip(page)).toHaveCount(2);

  const doc = (await readJson(page)) as any;
  expect(doc.panels).toHaveLength(2);
  expect(doc.panels[0].bodies.map((b: any) => b.character)).toEqual(["dan", "anna"]);
  expect(doc.panels[0].speakers.map((l: any) => l.balloon)).toEqual(["caption", "thought"]);
  expect(Math.abs(doc.panels[0].bodies[1].emotion.angle - Math.PI)).toBeLessThan(0.01);
});

test("PNG export produces a non-blank image", async ({ page }) => {
  await page.goto("/playground/");
  await expect(strip(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Download PNG" }).click()]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const { statSync } = await import("node:fs");
  expect(statSync(path!).size).toBeGreaterThan(20_000);
});
