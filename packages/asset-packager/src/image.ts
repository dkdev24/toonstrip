/**
 * Pixel plumbing: decode a PNG, measure its alpha, strip join markers,
 * rescale it to the spec's cell size. `@napi-rs/canvas` is the only decoder
 * in the repo already (`packages/cli` renders with it), so it is what this
 * uses rather than adding a second image dependency.
 */

import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { ALPHA_FLOOR, MARKER_COLOR } from "./spec.js";

export interface Raster {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Uint8ClampedArray;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Decodes a PNG and rasterises it, optionally rescaled to a square `edge`. */
export async function readPng(path: string, edge?: number): Promise<Raster> {
  const image = await loadImage(path);
  const width = edge ?? image.width;
  const height = edge ?? image.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data: data as unknown as Uint8ClampedArray };
}

/** Native (pre-rescale) dimensions of a PNG. */
export async function pngSize(path: string): Promise<{ width: number; height: number }> {
  const image = await loadImage(path);
  return { width: image.width, height: image.height };
}

/** Tight box around every pixel above {@link ALPHA_FLOOR}, or null if empty. */
export function alphaBox(raster: Raster): Box | null {
  const { width, height, data } = raster;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! <= ALPHA_FLOOR) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export interface AlphaStats {
  /** Fraction of the whole canvas that is fully or nearly opaque. */
  opaque: number;
  /** Fraction of the drawing's own box that is partially transparent. */
  fringe: number;
  /** Highest alpha found in the four corner pixels. */
  cornerAlpha: number;
  /** True if every pixel in the canvas is fully opaque (a flat background). */
  fullyOpaque: boolean;
}

export function alphaStats(raster: Raster, box: Box | null): AlphaStats {
  const { width, height, data } = raster;
  let opaque = 0;
  let partial = 0;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]!;
    if (a >= 250) opaque++;
    else if (a > ALPHA_FLOOR) partial++;
    else transparent++;
  }
  const corners = [
    data[3]!,
    data[(width - 1) * 4 + 3]!,
    data[(height - 1) * width * 4 + 3]!,
    data[((height - 1) * width + width - 1) * 4 + 3]!,
  ];
  const boxArea = box ? box.width * box.height : 1;
  return {
    opaque: opaque / (width * height),
    fringe: partial / boxArea,
    cornerAlpha: Math.max(...corners),
    fullyOpaque: transparent === 0 && partial === 0,
  };
}

/** True when the box touches a given canvas edge — a clipped drawing. */
export function touches(box: Box, raster: Raster): Record<"top" | "bottom" | "left" | "right", boolean> {
  return {
    top: box.y === 0,
    left: box.x === 0,
    bottom: box.y + box.height >= raster.height,
    right: box.x + box.width >= raster.width,
  };
}

export interface MarkerResult {
  /** Centroid of the marker pixels, in raster coordinates, or null. */
  point: { x: number; y: number } | null;
  /** How many pixels matched. */
  count: number;
}

/**
 * Finds join-marker pixels (opaque magenta) and erases them, so a marker
 * never ends up in the packed sheet. Mutates `raster.data`.
 */
export function takeMarker(raster: Raster): MarkerResult {
  const { width, height, data } = raster;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3]! < 250) continue;
      if (data[i] !== MARKER_COLOR.r || data[i + 1] !== MARKER_COLOR.g || data[i + 2] !== MARKER_COLOR.b) {
        continue;
      }
      sumX += x;
      sumY += y;
      count++;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  if (count === 0) return { point: null, count: 0 };
  return { point: { x: sumX / count, y: sumY / count }, count };
}

/** Wraps a raster back into a canvas, so it can be drawn into a sheet. */
export function toCanvas(raster: Raster): Canvas {
  const canvas = createCanvas(raster.width, raster.height);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(raster.width, raster.height);
  image.data.set(raster.data);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export { createCanvas, loadImage };
