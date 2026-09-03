// No jsdom here — `renderPlaceholder` is the Node/server half of M13, and
// must work with no DOM present at all (that is the point of the split).
import { describe, expect, it } from "vitest";
import type { ComicStripDocument } from "@toonstrip/schema";
import { renderPlaceholder } from "../src/server.js";

const doc: ComicStripDocument = {
  version: 1,
  panels: [{ backdrop: "pastoral", dark: true, bodies: [], speakers: [] }],
};

describe("renderPlaceholder", () => {
  it("renders a data: PNG sized to match the requested container width", async () => {
    const placeholder = await renderPlaceholder(doc, { width: 400 });
    expect(placeholder.src).toMatch(/^data:image\/png;base64,/);
    expect(placeholder.width).toBeGreaterThan(0);
    expect(placeholder.height).toBeGreaterThan(0);
  });

  it("produces a wider render at a wider requested width", async () => {
    const narrow = await renderPlaceholder(doc, { width: 400 });
    const wide = await renderPlaceholder({ ...doc, panels: [doc.panels[0], doc.panels[0]] }, { width: 1200 });
    expect(wide.width).toBeGreaterThan(narrow.width);
  });
});
