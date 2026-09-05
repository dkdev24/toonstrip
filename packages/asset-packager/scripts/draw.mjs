/**
 * Shared canvas geometry for the two fixture generators (`make-fixture.mjs`,
 * `make-sheet-fixture.mjs`) and `sheets.test.ts`: a face, a torso, and a
 * labelled grid sheet, drawn with plain canvas calls, no model involved.
 * Each caller tunes its own proportions.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";

export function write(root, relative, buffer) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
}

/** A head: chin near the bottom of the cell, hair cap, eyes/brows/mouth, neck stub. */
export function drawFace(
  ctx,
  edge,
  {
    skin,
    hair,
    mouth,
    brow,
    lineWidth = 6,
    lineJoin = "round",
    chinRatio = 0.88,
    rxRatio = 0.35,
    ryRatio = 0.36,
    eyeRx = 12,
    eyeRy = 14,
    neckHeightRatio = 0.1,
  },
) {
  const cx = edge / 2;
  const chin = edge * chinRatio;
  const rx = edge * rxRatio;
  const ry = edge * ryRatio;
  const cy = chin - ry;

  ctx.lineWidth = lineWidth;
  ctx.lineJoin = lineJoin;
  ctx.strokeStyle = "#101010";
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair as a filled cap over the top half of the skull.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(cx, cy - ry * 0.35, rx * 0.98, ry * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes, brows, mouth: the only things an emotion changes.
  ctx.fillStyle = "#101010";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * rx * 0.35, cy - ry * 0.05, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + side * rx * 0.15, cy - ry * 0.3);
    ctx.lineTo(cx + side * rx * 0.55, cy - ry * 0.3 - brow);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.3, cy + ry * 0.4);
  ctx.quadraticCurveTo(cx, cy + ry * 0.4 + mouth, cx + rx * 0.3, cy + ry * 0.4);
  ctx.stroke();

  // Neck stub: its bottom edge is the join the packer's convention finds.
  ctx.fillStyle = skin;
  ctx.fillRect(cx - rx * 0.22, chin - ry * 0.12, rx * 0.44, edge * neckHeightRatio);
  ctx.strokeRect(cx - rx * 0.22, chin - ry * 0.12, rx * 0.44, edge * neckHeightRatio);

  return { cx, chin, rx, ry };
}

/** A torso: shoulders near the top of the cell, cut off by the bottom edge. */
export function drawTorso(
  ctx,
  edge,
  {
    shirt,
    arms,
    outlineLineWidth = 6,
    outlineLineJoin = "round",
    armLineWidth = 22,
    neckRatio = 0.08,
    halfWidthRatio = 0.42,
    shoulderDropRatio = 0.28,
    bottomRatio = 1,
    liftRatio = 0.34,
  },
) {
  const cx = edge / 2;
  const neck = edge * neckRatio;
  const halfWidth = edge * halfWidthRatio;

  ctx.lineWidth = outlineLineWidth;
  ctx.lineJoin = outlineLineJoin;
  ctx.strokeStyle = "#101010";
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(cx - halfWidth * 0.35, neck);
  ctx.lineTo(cx + halfWidth * 0.35, neck);
  ctx.lineTo(cx + halfWidth, neck + edge * shoulderDropRatio);
  ctx.lineTo(cx + halfWidth * 0.8, edge * bottomRatio);
  ctx.lineTo(cx - halfWidth * 0.8, edge * bottomRatio);
  ctx.lineTo(cx - halfWidth, neck + edge * shoulderDropRatio);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#101010";
  ctx.lineWidth = armLineWidth;
  ctx.lineCap = "round";
  for (const [side, lift] of arms) {
    const shoulderX = cx + side * halfWidth * 0.85;
    const shoulderY = neck + edge * (shoulderDropRatio - 0.04);
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(shoulderX + side * edge * 0.06, shoulderY + edge * (liftRatio - 0.12) - lift * edge * liftRatio);
    ctx.stroke();
  }

  return { cx, neck, halfWidth };
}

/**
 * A labelled grid sheet on opaque white with painted gutters, the way a
 * model returns one. Without `names`, every one of `columns * rows` cells is
 * drawn unconditionally and unlabelled. With `names`, only its `names.length`
 * cells are visited at all; a falsy entry still gets a gutter box but stops
 * there (no label, no draw call), every other cell gets a bold label.
 * `draw(ctx, index, inner, name, cell)` paints inside the label band;
 * `jitter(index, name)` offsets it by a few pixels.
 */
export function sheet({ columns, rows, cell = 512, labelBand = 0, names, jitter = () => [0, 0], draw }) {
  const canvas = createCanvas(columns * cell, rows * cell);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const band = cell * labelBand;
  const count = names ? names.length : columns * rows;

  for (let index = 0; index < count; index++) {
    const name = names?.[index];
    ctx.save();
    ctx.translate((index % columns) * cell, Math.floor(index / columns) * cell);
    ctx.strokeStyle = "#8a8a8a";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, cell - 3, cell - 3);
    if (names && !name) {
      ctx.restore();
      continue;
    }
    if (name) {
      ctx.fillStyle = "#111111";
      ctx.font = `bold ${Math.round(cell * 0.05)}px sans-serif`;
      ctx.fillText(name, cell * 0.04, band * 0.72);
    }

    const [dx, dy] = jitter(index, name);
    ctx.save();
    ctx.beginPath();
    ctx.rect(4, band, cell - 8, cell - band - 4);
    ctx.clip();
    ctx.translate(dx, band + dy);
    draw(ctx, index, cell - band, name, cell);
    ctx.restore();
    ctx.restore();
  }

  return canvas.toBuffer("image/png");
}
