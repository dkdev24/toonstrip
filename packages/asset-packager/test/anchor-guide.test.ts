/**
 * `renderAnchorGuide`'s contract: a native-resolution PNG for a per-pose
 * NEUTRAL file, and a clear refusal (not a crash, not a silently wrong
 * image) for a sheet-sourced one.
 */
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadImage } from "@napi-rs/canvas";
import { analyze } from "../src/analyze.js";
import { renderAnchorGuide } from "../src/anchor-guide.js";

const FIXTURE = join(import.meta.dirname, "..", "fixtures", "source");
const FIXTURE_SHEETS = join(import.meta.dirname, "..", "fixtures", "source-sheets");

describe("renderAnchorGuide", () => {
  it("renders a per-pose NEUTRAL file at native resolution", async () => {
    const { source } = await analyze(FIXTURE);
    const character = source.characters.find((c) => c.id === "nib")!;
    const result = await renderAnchorGuide(character, "face");
    expect(result.file).toBe("face-NEUTRAL.png");
    const decoded = await loadImage(result.png);
    expect(decoded.width).toBe(result.width);
    expect(decoded.height).toBe(result.height);
  });

  it("refuses a sheet-sourced NEUTRAL cell instead of guiding the wrong image", async () => {
    const { source } = await analyze(FIXTURE_SHEETS);
    const character = source.characters.find((c) => c.id === "pim")!;
    await expect(renderAnchorGuide(character, "face")).rejects.toThrow(/comes from a sheet/);
  });

  it("reports a missing NEUTRAL part by name rather than throwing a raw lookup error", async () => {
    const { source } = await analyze(FIXTURE);
    const character = { ...source.characters.find((c) => c.id === "nib")!, parts: [] };
    await expect(renderAnchorGuide(character, "face")).rejects.toThrow(/no face-NEUTRAL part/);
  });
});
