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

/** Part kinds a source directory may contain. */
export const PART_KINDS = ["face", "torso"] as const;
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
  /**
   * Pack-time factor a face is resampled by before packing, anchored on its
   * own join point (so the join stays put — only the head shrinks). `1`
   * (default) keeps the big-headed cartoon proportion every part's fill
   * window is tuned for; a pack after realistic human proportions sets this
   * below 1. Applied once, baked into the packed sheet — the renderer never
   * scales a face independently of its torso (`@toonstrip/core`'s
   * `figure.ts`), so this is the only place a head:body ratio can be
   * authored. Overridable per character via `SourceCharacterDecl.faceScale`.
   */
  faceScale: number;
}

export const DEFAULT_SPEC: AssetImageSpec = {
  cell: 256,
  minInput: 256,
  backdropSize: 512,
  joinOverlap: 0,
  faceScale: 1,
};

/**
 * Fraction of a face cell's drawable height (below its label band) that is
 * head. `template.ts`'s guide draws the chin line here; a model that
 * reproduces the guide (drawing a neck stub or its dashed lines below the
 * chin, despite being told not to) has that content erased before measuring
 * — a face is head-only, per `docs/asset-image-spec.md` §3.
 */
export const FACE_CHIN_FRACTION = 0.86;

/**
 * Fraction of a torso cell's drawable height where `template.ts`'s guide
 * draws the neck line — headroom above it for a gesture pose's raised arm.
 * Unlike `FACE_CHIN_FRACTION`, this isn't a hard content boundary (a torso's
 * real neck line can legitimately sit higher or lower than the guide's own
 * nominal position, and a raised arm may reach anywhere in that headroom), so
 * nothing is erased against it — it's used only to draw the guide itself.
 */
export const TORSO_NECK_FRACTION = 0.25;

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
export const PART_FILENAME = /^(face|torso)-([A-Z0-9]+)(?:@(\d*\.?\d+))?(?:-(\d+))?\.png$/;

export interface ParsedPartName {
  kind: PartKind;
  emotion: string;
  intensity: number;
  variant: number;
}

/** Canonical ordering for a character's parts: kind, then emotion, then intensity, then variant. */
export function comparePartOrder(a: ParsedPartName, b: ParsedPartName): number {
  return a.kind.localeCompare(b.kind) || a.emotion.localeCompare(b.emotion) || a.intensity - b.intensity || a.variant - b.variant;
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
