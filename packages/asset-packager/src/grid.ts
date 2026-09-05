/**
 * Grid geometry and the raster surgery slicing needs.
 *
 * The grid is always *declared* (any rows × columns, from the sheet's own
 * `layout`/`ids`) and only ever *refined* from the pixels — a model asked for
 * a 4×3 sheet returns something close to a 4×3 sheet, not an exact one, so the
 * declared shape is the expectation and the gutters are the measurement
 * (dev plan §15).
 */

import { ALPHA_FLOOR } from "./spec.js";
import { createCanvas, toCanvas, type Box, type Raster } from "./image.js";

export interface Grid {
  columns: number;
  rows: number;
}

/**
 * Resolves a grid for `count` cells. Either dimension may be declared; what
 * is left is derived, and a grid with room to spare is fine — trailing cells
 * no id reaches are simply unused, which is what makes a model's habit of
 * filling out an awkward last row harmless.
 */
export function gridFor(count: number, columns?: number, rows?: number): Grid {
  if (columns && rows) return { columns, rows };
  if (columns) return { columns, rows: Math.max(1, Math.ceil(count / columns)) };
  if (rows) return { rows, columns: Math.max(1, Math.ceil(count / rows)) };
  const square = Math.max(1, Math.ceil(Math.sqrt(count)));
  return { columns: square, rows: Math.max(1, Math.ceil(count / square)) };
}

/** Per-column and per-row "how empty is this line" scores, 0..1. */
export interface Profiles {
  columns: Float64Array;
  rows: Float64Array;
}

/**
 * Emptiness by transparency, for a sheet drawn on transparent ground: a line
 * of pixels scores 1 when nothing is drawn on it.
 */
export function alphaProfiles(raster: Raster): Profiles {
  const { width, height, data } = raster;
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    let rowInk = 0;
    for (let x = 0; x < width; x++) {
      const ink = data[(y * width + x) * 4 + 3]! > ALPHA_FLOOR ? 1 : 0;
      rowInk += ink;
      columns[x]! += ink;
    }
    rows[y] = 1 - rowInk / width;
  }
  for (let x = 0; x < width; x++) columns[x] = 1 - columns[x]! / height;
  return { columns, rows };
}

/**
 * Emptiness by uniformity, for an opaque sheet (backdrops): a line scores 1
 * when every pixel on it is the same colour — a painted gutter, a margin, a
 * band of flat background — and near 0 across a scene.
 */
export function uniformityProfiles(raster: Raster): Profiles {
  const { width, height, data } = raster;
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  const at = (x: number, y: number) => (y * width + x) * 4;

  for (let x = 0; x < width; x++) {
    let variation = 0;
    for (let y = 1; y < height; y++) {
      const a = at(x, y - 1);
      const b = at(x, y);
      variation +=
        Math.abs(data[a]! - data[b]!) + Math.abs(data[a + 1]! - data[b + 1]!) + Math.abs(data[a + 2]! - data[b + 2]!);
    }
    columns[x] = 1 - Math.min(1, variation / (height * 24));
  }
  for (let y = 0; y < height; y++) {
    let variation = 0;
    for (let x = 1; x < width; x++) {
      const a = at(x - 1, y);
      const b = at(x, y);
      variation +=
        Math.abs(data[a]! - data[b]!) + Math.abs(data[a + 1]! - data[b + 1]!) + Math.abs(data[a + 2]! - data[b + 2]!);
    }
    rows[y] = 1 - Math.min(1, variation / (width * 24));
  }
  return { columns, rows };
}

/**
 * Cell boundaries along one axis: the nominal even division, each internal
 * boundary then pulled to the emptiest line within `window` of where it was
 * expected. A sheet with no visible gutters keeps the nominal division, which
 * is the correct fallback rather than a failure.
 */
export function boundaries(length: number, count: number, profile: Float64Array, window = 0.2): number[] {
  const nominal = length / count;
  const reach = Math.floor(nominal * window);
  const edges = [0];
  for (let i = 1; i < count; i++) {
    const expected = Math.round(i * nominal);
    let best = expected;
    let bestScore = -1;
    for (let x = Math.max(1, expected - reach); x <= Math.min(length - 1, expected + reach); x++) {
      // Prefer the emptiest line, and among equals the one closest to nominal.
      const score = profile[x]! - Math.abs(x - expected) / (reach + 1) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = x;
      }
    }
    edges.push(best);
  }
  edges.push(length);
  return edges;
}

/** The cell box at `(column, row)` for a set of axis boundaries. */
export function cellBox(x: number[], y: number[], column: number, row: number): Box {
  return {
    x: x[column]!,
    y: y[row]!,
    width: x[column + 1]! - x[column]!,
    height: y[row + 1]! - y[row]!,
  };
}

export function cropRaster(raster: Raster, box: Box): Raster {
  const width = Math.max(1, Math.min(box.width, raster.width - box.x));
  const height = Math.max(1, Math.min(box.height, raster.height - box.y));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((box.y + y) * raster.width + box.x) * 4;
    data.set(raster.data.subarray(from, from + width * 4), y * width * 4);
  }
  return { width, height, data };
}

/**
 * Pads a cell out to a square canvas, which is what everything downstream
 * expects. A cell taller than it is wide grows sideways; a cell wider than it
 * is tall grows *upward only*, so a torso drawn off the bottom edge of its
 * cell stays flush with the bottom of its canvas and the spec's
 * floating-torso check keeps meaning what it says.
 */
export function padToSquare(raster: Raster, keepBottom: boolean): Raster {
  const edge = Math.max(raster.width, raster.height);
  if (raster.width === raster.height) return raster;
  const data = new Uint8ClampedArray(edge * edge * 4);
  const offsetX = Math.floor((edge - raster.width) / 2);
  const offsetY = keepBottom ? edge - raster.height : Math.floor((edge - raster.height) / 2);
  for (let y = 0; y < raster.height; y++) {
    const from = y * raster.width * 4;
    data.set(
      raster.data.subarray(from, from + raster.width * 4),
      ((offsetY + y) * edge + offsetX) * 4,
    );
  }
  return { width: edge, height: edge, data };
}

/**
 * Erases a flat background by flood-filling inward from the cell's edges.
 *
 * Most image models cannot reliably emit transparency, so a character sheet
 * usually arrives on flat white. Keying from the border (rather than by
 * colour match everywhere) keeps a white shirt or a white eye white, because
 * those are not connected to the edge.
 */
export function keyBackground(raster: Raster, tolerance: number): number {
  const { width, height, data } = raster;
  const sample = (i: number) => [data[i]!, data[i + 1]!, data[i + 2]!] as const;
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ];
  const opaqueCorners = corners.filter((i) => data[i + 3]! > 200);
  if (opaqueCorners.length === 0) return 0;

  const [r0, g0, b0] = sample(opaqueCorners[0]!);
  const matches = (i: number) =>
    data[i + 3]! > ALPHA_FLOOR &&
    Math.abs(data[i]! - r0) + Math.abs(data[i + 1]! - g0) + Math.abs(data[i + 2]! - b0) <= tolerance * 3;

  const stack: number[] = [];
  const seen = new Uint8Array(width * height);
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let cleared = 0;
  while (stack.length > 0) {
    const p = stack.pop()!;
    const i = p * 4;
    if (!matches(i)) continue;
    data[i + 3] = 0;
    cleared++;
    const x = p % width;
    const y = (p - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  return cleared;
}

/** Rescales a raster to a square `edge`, so a grid's cells share one size. */
export function resizeRaster(raster: Raster, edge: number): Raster {
  if (raster.width === edge && raster.height === edge) return raster;
  const source = toCanvas(raster);

  const canvas = createCanvas(edge, edge);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, edge, edge);
  const { data } = ctx.getImageData(0, 0, edge, edge);
  return { width: edge, height: edge, data: data as unknown as Uint8ClampedArray };
}

/** The largest centred square inside a raster. */
export function centreSquare(raster: Raster): Box {
  const edge = Math.min(raster.width, raster.height);
  return {
    x: Math.floor((raster.width - edge) / 2),
    y: Math.floor((raster.height - edge) / 2),
    width: edge,
    height: edge,
  };
}

export interface Edges {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

/**
 * True when anything is drawn along one of the named edges — a cell bleeding
 * into the gutter, which usually means the slice cut through a drawing. Which
 * edges count depends on the part: a torso is *supposed* to run off the bottom
 * of its canvas, so its bottom edge is not evidence of a bad slice.
 */
export function inkAtEdge(raster: Raster, edges: Edges): boolean {
  const { width, height, data } = raster;
  const inked = (x: number, y: number) => data[(y * width + x) * 4 + 3]! > ALPHA_FLOOR;
  for (let x = 0; x < width; x++) {
    if (edges.top && inked(x, 0)) return true;
    if (edges.bottom && inked(x, height - 1)) return true;
  }
  for (let y = 0; y < height; y++) {
    if (edges.left && inked(0, y)) return true;
    if (edges.right && inked(width - 1, y)) return true;
  }
  return false;
}

/**
 * How flat one cell is, 0..1: the mean absolute deviation from its own mean
 * colour, inverted. Near 1 means nothing was drawn there. Measured on the
 * cropped cell rather than on the sheet's row/column profiles, because a
 * sheet-wide row crosses every cell in its row and so says nothing about any
 * one of them.
 */
export function flatness(raster: Raster): number {
  const { data } = raster;
  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
  }
  r /= pixels;
  g /= pixels;
  b /= pixels;
  let deviation = 0;
  for (let i = 0; i < data.length; i += 4) {
    deviation +=
      Math.abs(data[i]! - r) + Math.abs(data[i + 1]! - g) + Math.abs(data[i + 2]! - b);
  }
  return 1 - Math.min(1, deviation / pixels / 60);
}

/**
 * A perceptual signature for one backdrop cell.
 *
 * An 8x8 average hash alone is too coarse here: backdrops are band-structured
 * (sky over ground), so two quite different scenes can produce the same 64
 * bits. This pairs a 16x16 *difference* hash (which encodes left-to-right
 * gradients, i.e. where the content is) with the cell's mean colour, and calls
 * two cells the same scene only when both agree.
 */
export interface SceneSignature {
  hash: bigint;
  bits: number;
  mean: readonly [number, number, number];
}

export function sceneSignature(raster: Raster, edge = 16): SceneSignature {
  const canvas = createCanvas(edge + 1, edge);
  const ctx = canvas.getContext("2d");
  const source = toCanvas(raster);
  ctx.drawImage(source, 0, 0, edge + 1, edge);
  const { data } = ctx.getImageData(0, 0, edge + 1, edge);

  const grey = (x: number, y: number) => {
    const i = (y * (edge + 1) + x) * 4;
    return 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  };
  let hash = 0n;
  let bit = 0n;
  for (let y = 0; y < edge; y++) {
    for (let x = 0; x < edge; x++) {
      if (grey(x, y) < grey(x + 1, y)) hash |= 1n << bit;
      bit++;
    }
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
    n++;
  }
  return { hash, bits: edge * edge, mean: [r / n, g / n, b / n] };
}

/** True when two cells are the same scene: same structure and same colour. */
export function sameScene(a: SceneSignature, b: SceneSignature): { same: boolean; distance: number } {
  const distance = hamming(a.hash, b.hash);
  const colour =
    Math.abs(a.mean[0] - b.mean[0]) + Math.abs(a.mean[1] - b.mean[1]) + Math.abs(a.mean[2] - b.mean[2]);
  return { same: distance <= Math.round(a.bits * 0.04) && colour < 36, distance };
}

export function hamming(a: bigint, b: bigint): number {
  return (a ^ b).toString(2).replaceAll("0", "").length;
}
