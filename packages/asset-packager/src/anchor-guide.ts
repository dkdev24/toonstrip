/**
 * Authoring aid: renders a character's NEUTRAL face/torso art at native
 * resolution with a pixel-coordinate grid burned in, so a human — or a
 * vision model shown the image — can read off the join point (a face's
 * chin, a torso's collar opening) and hand it back as `anchors` in
 * `source.json` (`resolveJoin`'s highest-priority route, `pack.ts`).
 *
 * No model call happens here: the packager stays offline and deterministic
 * (`index.ts`'s own contract). This only produces the image the measuring
 * happens against, the same artifact a 2026-09 experiment used to check
 * whether AI-assisted measurement is accurate enough to be useful (see
 * `NOTES.md`) — average error landed at 3-9% of canvas size for a NEUTRAL
 * pose, comfortably inside `register()`'s ±14% correction window.
 */

import { readPng, toCanvas } from "./image.js";
import type { PartKind } from "./spec.js";
import type { SourceCharacter } from "./source.js";

const GRID_STEP = 20;
const GRID_COLOR = "rgba(255,0,255,0.55)";
const LABEL_COLOR = "rgba(200,0,200,0.95)";

export interface AnchorGuideResult {
  kind: PartKind;
  file: string;
  width: number;
  height: number;
  png: Buffer;
}

function drawGrid(canvas: ReturnType<typeof toCanvas>, width: number, height: number): void {
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = GRID_COLOR;
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = "12px sans-serif";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
    ctx.fillText(String(x), x + 2, 12);
  }
  for (let y = 0; y <= height; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
    ctx.fillText(String(y), 2, y + 12);
  }
}

/**
 * Renders `character`'s `kind`-NEUTRAL part with a pixel grid overlaid, in
 * that file's own native resolution — the same coordinate space `anchors`
 * expects (`resolveJoin` scales an anchor by `spec.cell / native.width`).
 *
 * Per-pose files only for now: a sheet-sourced NEUTRAL cell has no standalone
 * native-resolution file to read at full fidelity, and guiding a coordinate
 * pick against the down-sliced cell would defeat the point.
 */
export async function renderAnchorGuide(character: SourceCharacter, kind: PartKind): Promise<AnchorGuideResult> {
  const part = character.parts.find((p) => p.kind === kind && p.emotion === "NEUTRAL");
  if (!part) {
    throw new Error(`${character.dir}: no ${kind}-NEUTRAL part to guide`);
  }
  if (part.image) {
    throw new Error(
      `${character.dir}: ${kind}-NEUTRAL comes from a sheet (${part.origin}) — anchor-guide only ` +
        `supports a per-pose file today. Author it as ${kind}-NEUTRAL.png to use this command, or ` +
        `measure the sheet cell by hand.`,
    );
  }

  const raster = await readPng(part.path);
  const canvas = toCanvas(raster);
  drawGrid(canvas, raster.width, raster.height);
  const png = await canvas.encode("png");
  return { kind, file: part.file, width: raster.width, height: raster.height, png };
}
