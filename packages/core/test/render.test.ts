import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { Panel } from "@toonstrip/schema";
import { renderPanel } from "../src/render.js";
import { layoutStrip } from "../src/layout.js";
import { buildRealCast } from "./fixtures/real-cast.js";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "output");
mkdirSync(outDir, { recursive: true });

const panels: Panel[] = [
  {
    backdrop: "pastoral",
    camera: "establishing",
    roomTitle: "The Meadow",
    bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.2 } }],
    speakers: [{ speaker: "caption", balloon: "caption", text: "A quiet meadow." }],
  },
  {
    backdrop: "pastoral",
    camera: "medium",
    bodies: [
      { character: "dan", emotion: { angle: 0, intensity: 1 } },
      { character: "tiki", emotion: { angle: Math.PI, intensity: 0.8 } },
    ],
    speakers: [
      { speaker: "dan", balloon: "speech", text: "Good to see you again!" },
      { speaker: "tiki", balloon: "thought", text: "I was not expecting this." },
    ],
  },
  {
    backdrop: "pastoral",
    camera: "reaction",
    dark: false,
    bodies: [{ character: "tiki", emotion: { angle: 0, intensity: 0.5 }, pose: "wave" }],
    speakers: [],
  },
];

describe("renderPanel (fixture, real pack-comic-chat assets)", () => {
  let cast: Awaited<ReturnType<typeof buildRealCast>>;

  beforeAll(async () => {
    cast = await buildRealCast(["dan", "tiki"], ["pastoral"]);
  });

  it("renders a 3-panel document to PNG with non-blank pixels", () => {
    const { panelWidth, panelHeight } = layoutStrip(1200);
    for (const [i, panel] of panels.entries()) {
      const canvas = createCanvas(panelWidth, panelHeight);
      const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
      renderPanel(ctx, panel, cast, panelWidth, panelHeight);

      const png = canvas.toBuffer("image/png");
      writeFileSync(join(outDir, `panel-${i}.png`), png);
      expect(png.byteLength).toBeGreaterThan(0);

      const pixels = canvas.getContext("2d").getImageData(0, 0, panelWidth, panelHeight).data;
      expect(hasVariedPixels(pixels)).toBe(true);
    }
  });

  it("draws pure black for a dark panel and skips figures", () => {
    const { panelWidth, panelHeight } = layoutStrip(1200);
    const canvas = createCanvas(panelWidth, panelHeight);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const dark: Panel = {
      backdrop: "pastoral",
      camera: "medium",
      dark: true,
      bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0 } }],
      speakers: [],
    };
    renderPanel(ctx, dark, cast, panelWidth, panelHeight);
    const pixels = canvas.getContext("2d").getImageData(20, 20, 1, 1).data;
    // near-black interior (#0b0b0b), not the pastoral backdrop
    expect(pixels[0]).toBeLessThan(30);
    expect(pixels[2]).toBeLessThan(30);
  });
});

/** True if the buffer isn't a single solid color — a cheap stand-in for "something was drawn". */
function hasVariedPixels(data: Uint8ClampedArray): boolean {
  const [r0, g0, b0] = data;
  for (let i = 4; i < data.length; i += 4) {
    if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0) return true;
  }
  return false;
}
