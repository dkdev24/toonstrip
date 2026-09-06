/**
 * `template`: the reference sheet a reference-image model is prompted with.
 *
 * The point of handing a model a template is that layout, cell count and
 * per-cell framing stop being things a prompt has to describe in words — the
 * model copies an image instead. What it must *not* copy is the scaffolding
 * itself, so guides are drawn in pale grey and named as guides in the prompt
 * text this module emits alongside the image; the slicer then crops the label
 * band and keys the background regardless (dev plan §15).
 *
 * Both halves of the pair come out of here: the PNG, and the `layout`/`ids`
 * JSON to paste into `source.json` so the sheet the model returns slices back
 * into exactly the cells that were asked for.
 */

import { createCanvas } from "./image.js";
import { gridFor, type Grid } from "./grid.js";
import { FACE_CHIN_FRACTION, TORSO_NECK_FRACTION } from "./spec.js";

export type TemplateKind = "character" | "backdrop";

export interface TemplateOptions {
  kind: TemplateKind;
  /** Pixel size of one cell in the emitted template. */
  cell?: number;
  columns?: number;
  rows?: number;
  /** Cell names: pose names for a character sheet, ids for a backdrop sheet. */
  names?: string[];
  /** Fraction of each cell given to the printed label. */
  labelBand?: number;
}

export interface TemplateResult {
  png: Buffer;
  grid: Grid;
  /** Rows of cell names — a character sheet's `layout`. */
  layout: (string | null)[][];
  /** The `source.json` fragment declaring this sheet. */
  declaration: Record<string, unknown>;
  /** A prompt skeleton naming the rules the template cannot show. */
  prompt: string;
}

/** The nine wheel faces plus the five exposed gestures: a complete character. */
export const DEFAULT_CHARACTER_CELLS = [
  "face-NEUTRAL", "face-HAPPY", "face-COY", "face-BORED", "face-SCARED",
  "face-SAD", "face-ANGRY", "face-SHOUT", "face-LAUGH", "torso-NEUTRAL",
  "torso-WAVE", "torso-POINTOTHER", "torso-POINTSELF", "torso-DOUBLEPOINT", "torso-SHRUG",
];

const INK = "#1a1a1a";
const GUIDE = "#c9c9c9";
const GUTTER = "#8a8a8a";
const LABEL = "#5a5a5a";

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

// The renderer mirrors a figure's own art to face the *other* way in a
// two-shot (`drawFigure`'s `mirror` transform) — it never redraws or
// re-angles anything. So the base art has to start off-axis, facing one
// way, or there is nothing to mirror *from*. TURN_SHIFT biases every guide
// (face and torso alike) toward screen-right by the same amount, so a
// model reproducing the guide's silhouette copies an already-turned pose
// instead of a symmetric, camera-facing one.
const TURN_SHIFT = 0.06;

/**
 * Guides use the cell's real width and its height *below* the label band.
 * A face is head-only (`docs/asset-image-spec.md` §3) — the chin line is
 * where the drawing ends, nothing guided or drawn below it. (The slicer
 * erases anything a model draws past this line regardless — `sheet.ts`'s
 * `eraseBelowChin`, same `FACE_CHIN_FRACTION` — but the guide shouldn't
 * invite a neck stub in the first place.)
 */
function drawFaceGuides(ctx: Ctx, w: number, h: number): void {
  const centre = w * (0.5 + TURN_SHIFT);
  const chin = h * FACE_CHIN_FRACTION;
  const rx = w * 0.27;
  const ry = h * 0.28;
  ctx.strokeStyle = GUIDE;
  ctx.lineWidth = 2;

  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(centre, h * 0.04);
  ctx.lineTo(centre, chin);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.05, chin);
  ctx.lineTo(w * 0.95, chin);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(centre, chin - ry, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  // A profile hint on the leading (right) side — a plain circle reads as a
  // head facing the camera; this notch is what says "facing that way".
  ctx.beginPath();
  ctx.moveTo(centre + rx * 0.75, chin - ry * 1.15);
  ctx.lineTo(centre + rx * 1.18, chin - ry * 0.85);
  ctx.lineTo(centre + rx * 0.8, chin - ry * 0.55);
  ctx.stroke();
}

/**
 * A full standing figure — shoulders down through arms and legs to bare
 * feet — not a waist-cropped bust. Matches the original Comic Chat art
 * this format is ported from (see e.g. `pack-comic-chat`'s `dan`/`anna`
 * sheets: full body, head composited on separately, feet cut off by the
 * canvas's bottom edge). No head here; that is the face guide's job.
 */
function drawTorsoGuides(ctx: Ctx, w: number, h: number): void {
  const centre = w * (0.5 + TURN_SHIFT);
  // Neck sits well below the top edge (not h*0.1) so a raised-arm gesture
  // (torso-WAVE, POINTOTHER, ...) has headroom to stay inside the cell
  // instead of clipping against the top guide.
  const neck = h * TORSO_NECK_FRACTION;
  const shoulder = w * 0.325;
  // The near (right) side reads slightly larger/closer, the far (left)
  // side slightly smaller/set back — a 3/4-turn cue, not a frontal mirror.
  const nearScale = 1.08;
  const farScale = 0.86;
  ctx.strokeStyle = GUIDE;
  ctx.lineWidth = 2;

  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(centre, h * 0.02);
  ctx.lineTo(centre, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.05, neck);
  ctx.lineTo(w * 0.95, neck);
  ctx.stroke();

  ctx.setLineDash([]);
  // Torso: shoulders -> waist -> hips.
  const waistY = neck + h * 0.22;
  const hipY = neck + h * 0.32;
  ctx.beginPath();
  ctx.moveTo(centre - shoulder * 0.32, neck);
  ctx.lineTo(centre + shoulder * 0.32, neck);
  ctx.lineTo(centre + shoulder * nearScale, neck + h * 0.08);
  ctx.lineTo(centre + shoulder * 0.55 * nearScale, waistY);
  ctx.lineTo(centre + shoulder * 0.62 * nearScale, hipY);
  ctx.lineTo(centre - shoulder * 0.62 * farScale, hipY);
  ctx.lineTo(centre - shoulder * 0.55 * farScale, waistY);
  ctx.lineTo(centre - shoulder * farScale, neck + h * 0.08);
  ctx.closePath();
  ctx.stroke();
  // Arms: hanging from each shoulder point to roughly waist height.
  ctx.beginPath();
  ctx.moveTo(centre + shoulder * nearScale, neck + h * 0.08);
  ctx.lineTo(centre + shoulder * 1.15 * nearScale, waistY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centre - shoulder * farScale, neck + h * 0.08);
  ctx.lineTo(centre - shoulder * 1.1 * farScale, waistY * 0.97);
  ctx.stroke();
  // Legs: two separate limbs from the hips to bare feet at the bottom
  // edge (feet touch h — not a dead-space gap — so the drawing is "cut
  // off by the canvas edge", matching the validator's floating-torso check).
  const gap = shoulder * 0.08;
  ctx.beginPath();
  ctx.moveTo(centre + gap, hipY);
  ctx.lineTo(centre + shoulder * 0.5 * nearScale, h);
  ctx.moveTo(centre - gap, hipY);
  ctx.lineTo(centre - shoulder * 0.42 * farScale, h);
  ctx.stroke();
}

function drawBackdropGuides(ctx: Ctx, w: number, h: number): void {
  ctx.strokeStyle = GUIDE;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.lineTo(w, h * 0.62);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeRect(w * 0.5 - h * 0.5, 0, h, h);
}

export function renderTemplate(options: TemplateOptions): Promise<TemplateResult> {
  const kind = options.kind;
  const names =
    options.names && options.names.length > 0
      ? options.names
      : kind === "character"
        ? DEFAULT_CHARACTER_CELLS
        : ["scene-1", "scene-2", "scene-3", "scene-4"];
  const grid = gridFor(
    names.length,
    options.columns ?? (kind === "character" && !options.rows ? 5 : undefined),
    options.rows,
  );
  const cell = options.cell ?? 512;
  const labelBand = options.labelBand ?? 0.1;
  const bandPx = Math.round(cell * labelBand);

  const canvas = createCanvas(grid.columns * cell, grid.rows * cell);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const layout: (string | null)[][] = [];
  for (let row = 0; row < grid.rows; row++) {
    const rowNames: (string | null)[] = [];
    for (let column = 0; column < grid.columns; column++) {
      const index = row * grid.columns + column;
      const name = names[index] ?? null;
      rowNames.push(name);

      const originX = column * cell;
      const originY = row * cell;
      ctx.save();
      ctx.translate(originX, originY);

      // Gutter: a visible, empty frame is what the slicer snaps its
      // boundaries to when the model reproduces it even approximately.
      ctx.strokeStyle = GUTTER;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, cell - 3, cell - 3);

      if (name) {
        ctx.fillStyle = "#f2f2f2";
        ctx.fillRect(3, 3, cell - 6, bandPx - 3);
        ctx.fillStyle = INK;
        ctx.font = `bold ${Math.round(cell * 0.055)}px sans-serif`;
        ctx.fillText(name, cell * 0.04, bandPx * 0.72);

        ctx.save();
        ctx.translate(0, bandPx);
        const inner = cell - bandPx;
        if (kind === "backdrop") drawBackdropGuides(ctx, cell, inner);
        else if (name.startsWith("torso")) drawTorsoGuides(ctx, cell, inner);
        else drawFaceGuides(ctx, cell, inner);
        ctx.restore();
      } else {
        ctx.fillStyle = LABEL;
        ctx.font = `${Math.round(cell * 0.05)}px sans-serif`;
        ctx.fillText("unused — leave empty", cell * 0.08, cell * 0.5);
      }
      ctx.restore();
    }
    layout.push(rowNames);
  }

  const declaration =
    kind === "character"
      ? { sheet: { file: `characters/<id>/sheet.png`, layout, labelBand, keyBackground: true } }
      : {
          backdropSheets: [
            { file: `backdrops/sheet.png`, ids: names, columns: grid.columns, labelBand },
          ],
        };

  return Promise.resolve({
    png: canvas.toBuffer("image/png"),
    grid,
    layout,
    declaration,
    prompt: promptFor(kind, grid, names),
  });
}

function promptFor(kind: TemplateKind, grid: Grid, names: string[]): string {
  const shared = `Reproduce this reference sheet's exact grid: ${grid.columns} columns x ${grid.rows} rows, in the same order, same cell boundaries, same label position. Do not draw the pale grey guide lines or the guide captions — they mark where things go, they are not artwork. Keep the printed cell labels.`;

  if (kind === "backdrop") {
    return `${shared}

Draw one complete scene per cell, filling the cell edge to edge, in a single consistent illustration style across all ${names.length} cells: flat colour, clean outlines, no characters, no people, no text inside the scene, horizon roughly on the dashed line.

Cells, in order: ${names.join(", ")}.

Style: [describe the world once — palette, line weight, era, mood].`;
  }

  return `${shared}

Every cell is the same character, drawn at the same size and in the same style throughout — this is one character sheet, not ${names.length} separate drawings. Flat colour, clean hard-edged outlines, no shadows, no gradients, no background scenery. Every cell: 3/4 view, head and body turned to face screen-right, same angle throughout — not a frontal portrait (the renderer mirrors this art horizontally to face the other way when two characters share a scene, so it must start off-axis, not symmetric).

- \`face-*\` cells: the head only — skull, hair, features — nothing below the jaw (no neck, no shoulders, no collar, no chest — the torso cells supply those separately, and a face that draws any of them will double up when composited). Centred, about 55% of the cell width, ending exactly on the dashed chin rule — nothing drawn below it. The head must be the same size and in the same position in every face cell; only the eyes, brows and mouth change.
- \`torso-*\` cells: a full standing body — shoulders, arms, torso, legs, down to bare feet or footwear — not a waist-cropped bust. No head, no neck, no chin: the drawing starts at the collarbone, and the neck opening on the dashed neck rule stays empty (background) — the head composites into that opening from behind, it does not draw its own neck to meet it. Centred, shoulders about 65% of the cell width, with clear empty margin above the shoulder line (a raised arm, e.g. torso-WAVE, must stay inside that margin, not extend past the cell edge) and to the sides, feet touching the bottom edge of the cell — not floating above it with dead space below. The body must be the same size and in the same position in every torso cell; only the arms change. Face and torso fill-percentage both matter for their own sake — a face too small or a torso too cropped in its own cell reads as poorly composed — but they no longer have to match each other: the packer resamples the face independently (\`faceScale\` in \`source.json\`) to set the actual head-to-shoulder proportion, so draw each cell to fill its own window well and let that setting do the proportion work.

Cells, in order: ${names.join(", ")}.

Character: [describe the character once — age, build, hair, skin, clothing, palette, line weight].`;
}
