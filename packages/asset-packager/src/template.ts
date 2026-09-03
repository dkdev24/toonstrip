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
  labelBand: number;
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

/** Guides use the cell's real width and its height *below* the label band. */
function drawFaceGuides(ctx: Ctx, w: number, h: number): void {
  const centre = w / 2;
  const chin = h * 0.86;
  const rx = w * 0.35;
  const ry = h * 0.36;
  ctx.strokeStyle = GUIDE;
  ctx.lineWidth = 2;

  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(centre, h * 0.04);
  ctx.lineTo(centre, h * 0.98);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.05, chin);
  ctx.lineTo(w * 0.95, chin);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(centre, chin - ry, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  // The neck stub: a short box hanging below the chin rule.
  ctx.strokeRect(centre - w * 0.075, chin, w * 0.15, h * 0.1);

  ctx.fillStyle = LABEL;
  ctx.font = `${Math.round(h * 0.05)}px sans-serif`;
  ctx.fillText("chin rule — base of neck stub sits here", w * 0.05, chin - h * 0.02);
  ctx.fillText("head ~70% of cell width", w * 0.05, h * 0.08);
}

function drawTorsoGuides(ctx: Ctx, w: number, h: number): void {
  const centre = w / 2;
  const neck = h * 0.1;
  const half = w * 0.42;
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
  ctx.beginPath();
  ctx.moveTo(centre - half * 0.32, neck);
  ctx.lineTo(centre + half * 0.32, neck);
  ctx.lineTo(centre + half, neck + h * 0.26);
  ctx.lineTo(centre + half * 0.82, h);
  ctx.lineTo(centre - half * 0.82, h);
  ctx.lineTo(centre - half, neck + h * 0.26);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = LABEL;
  ctx.font = `${Math.round(h * 0.05)}px sans-serif`;
  ctx.fillText("neck rule — collar opening sits here", w * 0.05, neck - h * 0.02);
  ctx.fillText("body runs off the bottom edge", w * 0.05, h * 0.97);
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
  ctx.fillStyle = LABEL;
  ctx.font = `${Math.round(h * 0.05)}px sans-serif`;
  ctx.fillText("horizon", w * 0.04, h * 0.6);
  ctx.fillText("full-bleed scene, no characters", w * 0.04, h * 0.96);
  ctx.fillText("centre square is kept", w * 0.5 - h * 0.5 + h * 0.04, h * 0.08);
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
    labelBand,
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

Every cell is the same character, drawn at the same size and in the same style throughout — this is one character sheet, not ${names.length} separate drawings. Flat colour, clean hard-edged outlines, no shadows, no gradients, no background scenery.

- \`face-*\` cells: the head only — skull, hair, features — plus a short neck stub, centred, about 70% of the cell width, with the base of the stub on the dashed chin rule. The head must be the same size and in the same position in every face cell; only the eyes, brows and mouth change.
- \`torso-*\` cells: shoulders to waist, centred, about 85% of the cell width, neck opening on the dashed neck rule, body running off the bottom edge of the cell. The body must be the same size and in the same position in every torso cell; only the arms change.

Cells, in order: ${names.join(", ")}.

Character: [describe the character once — age, build, hair, skin, clothing, palette, line weight].`;
}
