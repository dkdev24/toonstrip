/**
 * Figures: pose selection and the face-onto-torso join.
 *
 * A complex character's poses are not baked figures — a face and a torso are
 * separate drawings, composited at draw time — so what is left at render
 * time is the emotion wheel (pure arithmetic, `./pose.js`) plus the join
 * geometry below, re-expressed as `drawImage` calls against a sprite sheet.
 */

import { selectComplexPose } from "./pose.js";
import type { EmotionOption } from "./emotion.js";
import type { CastManifest, PackedAvatar, PackedPart } from "./cast-manifest.js";

/** A drawable sheet image — an `HTMLImageElement`/`ImageBitmap` in a browser,
 *  an `@napi-rs/canvas` `Image` in Node. Anything `drawImage` accepts. */
export type SheetImage = CanvasImageSource;

export interface Cast {
  manifest: CastManifest;
  /** Character id -> decoded sheet, ready for `drawImage`. */
  sheets: Map<string, SheetImage>;
  backdrops: Map<string, SheetImage>;
}

/** A chosen figure: which parts, and the box they occupy in figure space. */
export interface Figure {
  avatar: PackedAvatar;
  face: PackedPart;
  torso: PackedPart;
  width: number;
  height: number;
  /** Where the head ends, from the top — the balloon tail's vertical target. */
  headHeight: number;
  /** Horizontal anchor for a balloon tail. */
  faceX: number;
  facePos: { x: number; y: number };
  torsoPos: { x: number; y: number };
}

/**
 * Per-character memory for the round-robin: begin the scan after the pose
 * used last, so a repeated emotion cycles through whatever variants exist
 * instead of returning the same drawing forever.
 */
export interface PoseCycle {
  face: number;
  torso: number;
}

export function newCycle(): PoseCycle {
  return { face: -1, torso: -1 };
}

function rotate<T>(items: readonly T[], start: number): T[] {
  if (items.length === 0) return [];
  const from = ((start % items.length) + items.length) % items.length;
  return [...items.slice(from), ...items.slice(0, from)];
}

/**
 * Choose a figure for an emotion set and assemble its geometry. The face
 * lands at `torso.cx + face.cxDelta - face.cx`, and the union box may extend
 * above and left of the torso, so everything is rebased onto it.
 */
export function figureFor(
  avatar: PackedAvatar, options: readonly EmotionOption[], cycle: PoseCycle,
): Figure | null {
  const faces = rotate(avatar.faces, cycle.face + 1);
  const torsos = rotate(avatar.torsos, cycle.torso + 1);
  const chosen = selectComplexPose(faces, torsos, options);
  const face = chosen.face;
  const torso = chosen.torso;
  if (!face || !torso) return null;

  cycle.face = avatar.faces.indexOf(face);
  cycle.torso = avatar.torsos.indexOf(torso);

  const xOffset = torso.cx + face.cxDelta - face.cx;
  const yOffset = torso.cy + face.cyDelta - face.cy;
  const left = Math.min(0, xOffset);
  const top = Math.min(0, yOffset);
  const right = Math.max(torso.figure.width, xOffset + face.figure.width);
  const bottom = Math.max(torso.figure.height, yOffset + face.figure.height);

  const facePos = { x: xOffset - left, y: yOffset - top };
  const torsoPos = { x: -left, y: -top };
  return {
    avatar, face, torso,
    width: right - left,
    height: bottom - top,
    headHeight: yOffset + face.figure.height - top,
    faceX: face.x + xOffset - left,
    facePos, torsoPos,
  };
}

/**
 * Draw a figure at `(x, y)`, scaled uniformly — a face never scales
 * differently from the torso it is composited onto. Compositing happens in
 * figure space; the viewport scale is applied afterwards, here, to the
 * assembled result.
 *
 * Draw order: both halos before either figure, then `torsoFirst` decides
 * whether the collar sits over the jaw.
 */
export function drawFigure(
  ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, figure: Figure,
  x: number, y: number, scale: number, mirror = false,
): void {
  const { face, torso, facePos, torsoPos } = figure;
  // `mirror` flips the figure horizontally about its own box so it faces the
  // other way — in a two-shot the right-hand figure is mirrored so the two
  // look at each other instead of both facing out. Done with a transform
  // rather than per-part x maths so the face/torso join flips as one unit.
  ctx.save();
  if (mirror) {
    ctx.translate(x + figure.width * scale, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  const part = (p: PackedPart, rect: typeof p.figure | null, pos: { x: number; y: number }) => {
    if (!rect) return;
    ctx.drawImage(
      sheet, rect.x, rect.y, rect.width, rect.height,
      // The aura rect and the figure rect share dimensions (packed as a pair),
      // so one placement serves both.
      pos.x * scale, pos.y * scale, rect.width * scale, rect.height * scale,
    );
  };

  part(torso, torso.aura, torsoPos);
  part(face, face.aura, facePos);
  if (figure.avatar.torsoFirst) {
    part(torso, torso.figure, torsoPos);
    part(face, face.figure, facePos);
  } else {
    part(face, face.figure, facePos);
    part(torso, torso.figure, torsoPos);
  }
  ctx.restore();
}
