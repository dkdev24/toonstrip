/**
 * One decode per input file. Everything downstream — validation, packing,
 * the join preview — works off these measurements rather than re-reading the
 * PNGs, and the marker pixel is taken *before* the rescale to the spec's cell
 * size (a resample would smear the exact magenta and lose it).
 */

import { alphaBox, alphaStats, createCanvas, loadImage, takeMarker, toCanvas, type AlphaStats, type Box, type Raster } from "./image.js";
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

function rasterOf(source: { width: number; height: number }, draw: (ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>) => void): Raster {
  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext("2d");
  draw(ctx);
  const { data } = ctx.getImageData(0, 0, source.width, source.height);
  return { width: source.width, height: source.height, data: data as unknown as Uint8ClampedArray };
}

/** A private copy, so measuring never mutates a raster a sheet slice shares. */
function clone(raster: Raster): Raster {
  return { width: raster.width, height: raster.height, data: new Uint8ClampedArray(raster.data) };
}

export async function measurePart(part: SourcePart, spec: AssetImageSpec): Promise<MeasuredPart> {
  // A sheet cell arrives already sliced, keyed and squared; a per-pose part is
  // decoded from its own file. Everything after this point is identical.
  const nativeRaster = part.image
    ? clone(part.image)
    : await (async () => {
        const image = await loadImage(part.path);
        return rasterOf({ width: image.width, height: image.height }, (ctx) =>
          ctx.drawImage(image, 0, 0),
        );
      })();
  const native = { width: nativeRaster.width, height: nativeRaster.height };
  const marker = takeMarker(nativeRaster);

  const scaleX = spec.cell / native.width;
  const scaleY = spec.cell / native.height;
  const cellRaster =
    native.width === spec.cell && native.height === spec.cell
      ? nativeRaster
      : rasterOf({ width: spec.cell, height: spec.cell }, (ctx) =>
          ctx.drawImage(toCanvas(nativeRaster), 0, 0, spec.cell, spec.cell),
        );

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
  const raster = rasterOf({ width: spec.backdropSize, height: spec.backdropSize }, (ctx) =>
    ctx.drawImage(image, 0, 0, spec.backdropSize, spec.backdropSize),
  );
  return { backdrop, native, raster, stats: alphaStats(raster, null) };
}
