/**
 * Registering one sheet cell against another.
 *
 * This is what sheet input buys that a folder of separate files cannot give
 * (dev plan §15): every cell of a sheet was drawn in one pass at one scale, so
 * a pose drawn slightly high or left can be *corrected* against the NEUTRAL
 * cell instead of deriving its own, slightly wrong, join.
 *
 * The measure is silhouette disagreement — where one mask has ink and the
 * other does not — searched coarse then fine. Alignment is dominated by the
 * big shared mass (the skull, the shoulders) rather than by whatever changed
 * between the two poses (a fringe, a raised arm), which is exactly the
 * behaviour wanted here.
 */

import { ALPHA_FLOOR } from "./spec.js";
import type { Raster } from "./image.js";

export interface Registration {
  /** Shift, in cell pixels, that maps the reference onto this cell. */
  dx: number;
  dy: number;
  /** Fraction of the compared area still disagreeing, 0..1. Lower is better. */
  mismatch: number;
}

export const NO_SHIFT: Registration = { dx: 0, dy: 0, mismatch: 0 };

function maskOf(raster: Raster): Uint8Array {
  const mask = new Uint8Array(raster.width * raster.height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = raster.data[i * 4 + 3]! > ALPHA_FLOOR ? 1 : 0;
  }
  return mask;
}

function disagreement(
  cell: Uint8Array, reference: Uint8Array, width: number, height: number, dx: number, dy: number,
): number {
  let differing = 0;
  let compared = 0;
  for (let y = 0; y < height; y++) {
    const refY = y - dy;
    if (refY < 0 || refY >= height) continue;
    for (let x = 0; x < width; x++) {
      const refX = x - dx;
      if (refX < 0 || refX >= width) continue;
      compared++;
      if (cell[y * width + x] !== reference[refY * width + refX]) differing++;
    }
  }
  return compared === 0 ? 1 : differing / compared;
}

/**
 * Best shift of `reference` onto `cell`, searched within 14% of the cell width.
 * Both rasters must be the same size — sheet cells always are, having been
 * sliced from one grid and padded to one square.
 */
export function register(cell: Raster, reference: Raster): Registration {
  if (cell.width !== reference.width || cell.height !== reference.height) return NO_SHIFT;
  const width = cell.width;
  const height = cell.height;
  const reach = Math.max(2, Math.round(width * 0.14));
  const a = maskOf(cell);
  const b = maskOf(reference);

  let best: Registration = { ...NO_SHIFT, mismatch: disagreement(a, b, width, height, 0, 0) };
  const scan = (from: number, to: number, step: number, around: Registration): Registration => {
    let winner = around;
    for (let dy = from; dy <= to; dy += step) {
      for (let dx = from; dx <= to; dx += step) {
        const mismatch = disagreement(a, b, width, height, around.dx + dx, around.dy + dy);
        if (mismatch < winner.mismatch) winner = { dx: around.dx + dx, dy: around.dy + dy, mismatch };
      }
    }
    return winner;
  };

  const coarseStep = Math.max(2, Math.round(reach / 6));
  best = scan(-reach, reach, coarseStep, best);
  best = scan(-coarseStep, coarseStep, 1, best);
  return best;
}
