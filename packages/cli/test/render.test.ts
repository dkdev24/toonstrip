import { describe, expect, it } from "vitest";
import { renderDocument } from "../src/render.js";

const doc = {
  version: 1,
  panels: [
    { backdrop: "pastoral", camera: "establishing", bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.6 } }], speakers: [{ speaker: "dan", balloon: "speech", text: "Rendered in Node." }] },
    { backdrop: "pastoral", camera: "medium", bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.6 } }, { character: "anna", emotion: { angle: Math.PI, intensity: 0.5 } }], speakers: [{ speaker: "anna", balloon: "thought", text: "Two columns at 900." }] },
  ],
};

describe("toonstrip render", () => {
  it("renders a document to a PNG with the element's column policy", async () => {
    const result = await renderDocument(doc, { width: 900, scale: 1 });
    expect(result.columns).toBe(2);
    // Two native panels (400) + one gutter (10), 340 tall.
    expect(result.width).toBe(810);
    expect(result.height).toBe(340);
    expect(result.png.subarray(1, 4).toString()).toBe("PNG");
    expect(result.png.length).toBeGreaterThan(20_000);
  });

  it("refuses an unknown character id instead of falling back", async () => {
    const bad = { ...doc, panels: [{ ...doc.panels[0], bodies: [{ character: "nobody", emotion: { angle: 0, intensity: 0 } }], speakers: [] }] };
    await expect(renderDocument(bad, { width: 400 })).rejects.toThrow(/unknown character "nobody"/);
  });

  it("rejects an invalid document at the boundary", async () => {
    await expect(renderDocument({ version: 1 }, {})).rejects.toThrow();
  });
});
