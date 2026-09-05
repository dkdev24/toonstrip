/**
 * One decode per input file. Everything downstream — validation, packing,
 * the join preview — works off these measurements rather than re-reading the
 * PNGs, and the marker pixel is taken *before* the rescale to the spec's cell
 * size (a resample would smear the exact magenta and lose it).
 */

import { alphaBox, alphaStats, loadImage, readPng, takeMarker, type AlphaStats, type Box, type Raster } from "./image.js";
import { resizeRaster } from "./grid.js";
import type { AssetImageSpec } from "./spec.js";
import type { SourceBackdrop, SourcePart } from "./source.js";

export interface MeasuredPart {
  part: SourcePart;
  /** Input canvas size, before the rescale to `spec.cell`. */
  native: { width: number; height: number };
  /** The art at cell size, markers erased. */
  raster: Raster;
  /** Tight box around the art, in cell coordinates. Null when the file is blank. */
  box: Box | null;
  stats: AlphaStats;
  /** Marker centroid in cell coordinates, or null when no marker was drawn. */
  marker: { x: number; y: number } | null;
  markerPixels: number;
}

export interface MeasuredBackdrop {
  backdrop: SourceBackdrop;
  native: { width: number; height: number };
  raster: Raster;
  stats: AlphaStats;
}

/** A private copy, so measuring never mutates a raster a sheet slice shares. */
function clone(raster: Raster): Raster {
  return { width: raster.width, height: raster.height, data: new Uint8ClampedArray(raster.data) };
}

export async function measurePart(part: SourcePart, spec: AssetImageSpec): Promise<MeasuredPart> {
  // A sheet cell arrives already sliced, keyed and squared; a per-pose part is
  // decoded from its own file. Everything after this point is identical.
  const nativeRaster = part.image ? clone(part.image) : await readPng(part.path);
  const native = { width: nativeRaster.width, height: nativeRaster.height };
  const marker = takeMarker(nativeRaster);

  const scaleX = spec.cell / native.width;
  const scaleY = spec.cell / native.height;
  const cellRaster = resizeRaster(nativeRaster, spec.cell);

  const box = alphaBox(cellRaster);
  return {
    part,
    native,
    raster: cellRaster,
    box,
    stats: alphaStats(cellRaster, box),
    marker: marker.point ? { x: marker.point.x * scaleX, y: marker.point.y * scaleY } : null,
    markerPixels: marker.count,
  };
}

export async function measureBackdrop(
  backdrop: SourceBackdrop,
  spec: AssetImageSpec,
): Promise<MeasuredBackdrop> {
  if (backdrop.image) {
    const raster = clone(backdrop.image);
    return { backdrop, native: { width: raster.width, height: raster.height }, raster, stats: alphaStats(raster, null) };
  }
  const image = await loadImage(backdrop.path);
  const native = { width: image.width, height: image.height };
  const raster = await readPng(backdrop.path, spec.backdropSize);
  return { backdrop, native, raster, stats: alphaStats(raster, null) };
}
