/**
 * The asset image specification, as code.
 *
 * `docs/asset-image-spec.md` is the prose version of everything in this file —
 * the rules an input PNG has to follow to be packable. They are kept tight
 * enough that an image-generation prompt can hit them, because the most
 * likely source of new art is a model emitting one transparent PNG per pose
 * (dev plan §14). Nothing here calls a model: the packager consumes finished
 * PNGs only.
 */

import { EMOTION_NAMES, EMOTION_ANGLES } from "@toonstrip/core";

export const SPEC_VERSION = 1;

/** Part kinds a source directory may contain. */
export const PART_KINDS = ["face", "torso", "body"] as const;
export type PartKind = (typeof PART_KINDS)[number];

export interface AssetImageSpec {
  /** Output part canvas edge in px. Every part is square and scaled to this. */
  cell: number;
  /** Smallest accepted input edge. Inputs below this are an error. */
  minInput: number;
  /** Output backdrop edge in px. Backdrops are square (the renderer covers). */
  backdropSize: number;
  /** How far the head sinks into the collar, in cell-space px. */
  joinOverlap: number;
}

export const DEFAULT_SPEC: AssetImageSpec = {
  cell: 256,
  minInput: 256,
  backdropSize: 512,
  joinOverlap: 0,
};

/**
 * How much of its canvas a part's drawing is expected to occupy. Outside the
 * window is a warning, never an error: it renders, it just means the figure's
 * head/body proportion drifts from the rest of the pack. The two windows
 * overlap deliberately — a head nearly as wide as the shoulders is the look
 * (the default pack's faces are ~0.87 of their torso width).
 */
export const FILL_WINDOW: Record<PartKind, { min: number; max: number }> = {
  face: { min: 0.5, max: 0.98 },
  torso: { min: 0.55, max: 1.0 },
  body: { min: 0.4, max: 1.0 },
};

/** Alpha at or below this counts as background when finding a drawing's box. */
export const ALPHA_FLOOR = 8;

/**
 * The optional join marker: a fully opaque magenta pixel (or small blob)
 * marking the exact join point. Erased from the art before packing.
 */
export const MARKER_COLOR = { r: 255, g: 0, b: 255 } as const;

/** How much of a part may be soft-edged before it reads as a blurry upscale. */
export const MAX_FRINGE_RATIO = 0.35;

/** Filename form: `<kind>-<EMOTION>[@<intensity>][-<variant>].png`. */
export const PART_FILENAME =
  /^(face|torso|body)-([A-Z0-9]+)(?:@(\d*\.?\d+))?(?:-(\d+))?\.png$/;

export interface ParsedPartName {
  kind: PartKind;
  emotion: string;
  intensity: number;
  variant: number;
}

export function emotionIndex(name: string): number {
  return (EMOTION_NAMES as readonly (string | null)[]).indexOf(name);
}

export function isKnownEmotion(name: string): boolean {
  return emotionIndex(name) > 0;
}

/** Runtime wheel angle (or gesture sentinel) for a named emotion. */
export function angleFor(name: string): number {
  const index = emotionIndex(name);
  return index > 0 ? (EMOTION_ANGLES[index] ?? 0) : 0;
}

/**
 * Intensity when a filename does not state one. NEUTRAL is the only named
 * emotion whose angle is shared with another (HAPPY), so its 0 is what
 * distinguishes it — see `@toonstrip/core`'s emotion wheel.
 */
export function defaultIntensity(name: string): number {
  return name === "NEUTRAL" ? 0 : 1;
}

/** Parses a part filename, or returns null if it does not match the spec. */
export function parsePartName(file: string): ParsedPartName | null {
  const match = PART_FILENAME.exec(file);
  if (!match) return null;
  const [, kind, emotion, intensity, variant] = match;
  return {
    kind: kind as PartKind,
    emotion: emotion!,
    intensity: intensity === undefined ? defaultIntensity(emotion!) : Number(intensity),
    variant: variant === undefined ? 1 : Number(variant),
  };
}

/** The names a prompt author may use, in wheel order then gesture order. */
export const EMOTION_LIST: string[] = (EMOTION_NAMES as readonly (string | null)[]).filter(
  (n): n is string => n !== null,
);
