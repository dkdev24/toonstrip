/**
 * Proves the pack contract isn't secretly coupled to `@toonstrip/pack-comic-chat`:
 * `@toonstrip/pack-example` is a small, wholly original pack (see its NOTICE),
 * and this renders a real panel from it through the same `renderPanel` path
 * `test/render.test.ts` exercises against the default pack (M5, see NOTES.md).
 */
import { describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { loadCastManifest } from "@toonstrip/pack-example";
import { renderPanel } from "../src/render.js";
import type { Cast } from "../src/figure.js";

describe("pack-example renders through packages/core", () => {
  it("renders a panel using pip and the meadow backdrop", async () => {
    const manifest = loadCastManifest();
    const sheets = new Map();
    for (const [id, avatar] of Object.entries(manifest.cast)) {
      sheets.set(id, await loadImage(avatar.sheet));
    }
    const backdrops = new Map();
    for (const b of manifest.backdrops) {
      backdrops.set(b.id, await loadImage(b.file));
    }
    const cast: Cast = { manifest, sheets, backdrops };

    const width = 400;
    const height = 340;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    renderPanel(
      ctx,
      {
        backdrop: "meadow",
        camera: "medium",
        bodies: [{ character: "pip", emotion: { angle: 0, intensity: 0.8 } }],
        speakers: [{ speaker: "pip", balloon: "speech", text: "Hello from a from-scratch pack!" }],
      },
      cast,
      width,
      height,
      {},
    );

    const pixels = ctx.getImageData(0, 0, width, height).data;
    const colors = new Set<string>();
    for (let i = 0; i < pixels.length; i += 4) {
      colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    }
    expect(colors.size).toBeGreaterThan(10);
  });
});
