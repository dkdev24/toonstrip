/**
 * The multi-balloon layout driver.
 *
 * Balloons in a panel are not stacked; each is placed over its own speaker
 * and then squeezed out of the way of the balloons already placed, so every
 * tail can still reach its head without crossing another balloon. That
 * "without crossing" is the route region: a horizontal corridor each balloon
 * reserves between itself and its speaker. A later balloon may not be placed
 * inside a corridor an earlier one owns, and once placed it carves its own
 * span out of theirs. When a balloon cannot be placed at all the *panel* is
 * refused — the caller's signal to split the panel's lines across more than
 * one panel.
 *
 * Coordinates are CSS px with y pointing down; `top` is the smaller y.
 *
 * **Determinism.** Two rolls (the width goal, the horizontal straddle) are
 * drawn from a small deterministic PRNG seeded by the panel's own content
 * ({@link panelSeed}), so a panel with the same speakers and text always
 * lays out the same way and a caller can replay a strip exactly.
 */

import type { BalloonBox } from "./balloon.js";
import {
  AREA_FUDGE, LINE_HEIGHT, ONE_LINE_THRESHOLD,
  chromeFor, measureAtWidth, splitHeight, widestWord,
} from "./balloon.js";
import type { Line } from "@toonstrip/schema";

/** A rectangle in panel space, y down: `top` is the smaller y. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The corridor a balloon reserves between itself and its speaker. */
export interface RouteRgn {
  left: number;
  right: number;
  bottom: number;
}

/** One balloon offered to the driver, in the panel's draw order. */
export interface BalloonInput {
  /** Speaker id, so the caller can match a laid-out box back to its line. */
  speaker: string;
  /** A caption: pinned left, and it reserves no corridor. */
  isBox: boolean;
  /**
   * The x a tail must reach, or `null` for a speaker with no body on stage
   * (or a caption); such a balloon is placed like a caption and blocks
   * nobody's route.
   */
  arrowX: number | null;
  text: string;
  /** The balloon kind, for {@link chromeFor}/{@link measureAtWidth}/{@link splitHeight}. */
  kind: Line["balloon"];
  /** `ctx.font` must already be set to {@link "./balloon.js".balloonFont}`(scale)` — the caller sets it once for the whole panel. */
  ctx: CanvasRenderingContext2D;
}

/** A placed balloon: where it goes, how its text broke, what corridor it owns. */
export interface LaidBalloon {
  input: BalloonInput;
  box: BalloonBox;
  lines: readonly string[];
  routeRgn: RouteRgn;
}

export type LayoutResult =
  | { fits: true; balloons: LaidBalloon[]; leftover: string | null }
  | { fits: false };

/** The drop a tail needs below the balloon. */
const MIN_HOOK_HEIGHT = 20;
/** The width a corridor may not shrink past. */
const MIN_ROUTE_WIDTH = 60;
/**
 * The lift taken off a previous balloon's box bottom before it becomes the
 * next balloon's ceiling. Zero here: `box` is already the text box alone
 * (a tail is drawn from it, not measured into it), so no separate overhang
 * correction is needed.
 */
const DOCK_DELTA = 0;
/** How far below the free rect's top a balloon nothing pushed down docks. */
const TOP_BORDER = 4;
/** The fudge a balloon's width goal is padded by, twice over, before being capped. */
const WIDTH_FUDGE = 40;
const LARGE = Infinity;

/**
 * A deterministic stand-in for `rand`: mulberry32, chosen because it is four
 * lines and has no state to carry between panels. Every roll the driver
 * makes comes from here, so a panel with the same content always lays out
 * the same way.
 */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The panel's seed, derived from its own content (FNV-1a over each speaker
 * and line). Two panels that say the same thing lay out the same way, and a
 * replayed panel lays out as it did the first time.
 *
 * Speaker and text are joined with NUL/SOH control bytes, not a plain space:
 * a space is content a real speaker id or line could itself contain, which
 * would let two different panels collide on the same seed (speaker `"a b"`
 * + text `"c"` vs. speaker `"a"` + text `"b c"`). Control bytes can't appear
 * in either field, so the join is unambiguous.
 */
export function panelSeed(inputs: readonly BalloonInput[]): number {
  let hash = 0x811c9dc5;
  for (const input of inputs) {
    for (const ch of `${input.speaker}\x00${input.text}\x01`) {
      hash ^= ch.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash >>> 0;
}

/**
 * Place every balloon in draw order, and give up on the whole panel the
 * moment one will not go — except a panel holding exactly one balloon that
 * will not fit, which is force-fitted into the free rect and split, since
 * refusing it would refuse a panel a fresh, empty panel could not hold
 * either.
 */
export function layoutBalloons(
  inputs: readonly BalloonInput[], freeRect: Rect, seed = panelSeed(inputs), scale = 1,
): LayoutResult {
  const random = makeRandom(seed); // always lay out the same way for this seed
  const laid: LaidBalloon[] = [];
  const corridors = speakerCorridors(inputs, freeRect, scale);

  for (let i = 0; i < inputs.length; i++) {
    const balloon = layoutBalloon(
      inputs[i]!, laid, freeRect, corridors.get(inputs[i]!), random, scale,
    );
    if (!balloon) {
      if (i === 0 && inputs.length === 1) return forceFitBalloon(inputs[0]!, freeRect, scale);
      return { fits: false };
    }
    laid.push(balloon);
  }
  return { fits: true, balloons: laid, leftover: null };
}

/** The floor a pre-allocated speaker corridor may not shrink past, at native scale. */
const MIN_CORRIDOR_WIDTH = 90;

/**
 * Each straddling balloon's starting horizontal budget, computed once up
 * front from every speaker's own `arrowX` — not the greedy, order-dependent
 * squeeze {@link getInterveningBBox} applies afterward. Without this, the
 * *first* balloon in draw order estimates its width against the whole free
 * rect (and the roll in {@link getCloudEstimate} is deliberately skewed
 * wide, to keep a balloon from wrapping tall into its own speaker's head —
 * see v0.7.6, `WORKLOG.md`), which routinely leaves a second speaker's
 * balloon nowhere to sit but *below* the first instead of beside it. Two
 * stacked balloons blow through the panel's headroom band (`BALLOON_HEADROOM`
 * in `render.ts`) far more easily than two side-by-side ones, which is why a
 * realistic two-speaker panel could fail here even at the renderer's own
 * native `UNIT` size, well before any real-embed scale-down made it worse.
 *
 * **Every speaking balloon gets one, not just the first — a deliberate
 * choice, tested against the alternative.** Bounding only the balloon with
 * no laid predecessor (`laid.length === 0`) sounds more surgical, but it
 * reopens the same bug for a *second* balloon whose own corridor-bounded
 * predecessor still ends up wide: `getInterveningBBox`'s horizontal defense
 * (`queryRouteRgn`) is anchored to the predecessor's `arrowX`, not its box's
 * actual right edge, so an unbounded second balloon's roll can land inside
 * that gap and still overlap the predecessor's real box, triggering the
 * exact same stack-below fallback this divergence exists to prevent
 * (reproduced with this project's own real dialogue and seed — see the
 * `HANDOFF.md`/`WORKLOG.md` entry that first shipped this file, 2026-09-02).
 * A sibling project (`grues-in-comic`) found a *different* problem with
 * applying this to every balloon — its panelization pre-check shares this
 * exact function with the renderer, so a narrower estimate here also
 * changed how content gets grouped into panels, regressing its
 * packing-density baseline for no corresponding benefit — but that risk
 * doesn't apply here: nothing in this package calls `layoutBalloons` except
 * the renderer itself, so it scopes the corridor to the first balloon only
 * instead. Each repo's own real content and constraints, not a preference,
 * decide which design is correct there.
 *
 * Bounded by the midpoint to the nearest other speaker on either side, so no
 * balloon can reach into a neighbour's half before the squeeze pass even
 * runs. A caption and a bodiless speaker (no `arrowX`) get no corridor —
 * they lay out against the full free rect exactly as before.
 */
function speakerCorridors(
  inputs: readonly BalloonInput[], freeRect: Rect, scale = 1,
): Map<BalloonInput, Rect> {
  const speaking = inputs.filter((i) => !i.isBox && i.arrowX !== null);
  const corridors = new Map<BalloonInput, Rect>();
  const minWidth = MIN_CORRIDOR_WIDTH * scale;
  for (const input of speaking) {
    const ax = input.arrowX!;
    let left = freeRect.left;
    let right = freeRect.right;
    for (const other of speaking) {
      if (other === input) continue;
      const mid = (ax + other.arrowX!) / 2;
      if (other.arrowX! < ax) left = Math.max(left, mid);
      else right = Math.min(right, mid);
    }
    if (right - left < minWidth) {
      const centre = (left + right) / 2;
      left = Math.max(freeRect.left, centre - minWidth / 2);
      right = Math.min(freeRect.right, left + minWidth);
    }
    corridors.set(input, { left, top: freeRect.top, right, bottom: freeRect.bottom });
  }
  return corridors;
}

/** One balloon's placement: estimate a span, squeeze it into the free corridor, measure, validate. */
function layoutBalloon(
  input: BalloonInput, laid: readonly LaidBalloon[], freeRect: Rect,
  corridor: Rect | undefined, random: () => number, scale = 1,
): LaidBalloon | null {
  const bounds = corridor ?? freeRect;
  const brect = getCloudEstimate(input, laid, freeRect, bounds, random, scale); // best guess
  // squeezed between the corridors, and pushed below anything in the way
  const pushed = getInterveningBBox(input, laid, freeRect, brect, scale);

  const span = brect.right - brect.left;
  // A span that cannot hold the widest single word is not a balloon.
  if (span - chromeFor({ balloon: input.kind }, scale) * 2 < widestWord(input.ctx, input.text)) return null;

  const measured = measureAtWidth(input.ctx, { balloon: input.kind, text: input.text }, span, scale);
  const box: BalloonBox = {
    x: brect.left, y: brect.top, width: measured.width, height: measured.height,
  };
  // A balloon nothing pushed down docks flush to the free rect's top.
  if (!pushed) box.y = freeRect.top + TOP_BORDER * scale;

  // The estimate placed the *span* so it covers the arrow. The wrap is
  // word-granular, so the true box can come back narrower than the span it
  // was granted and that guarantee can slip; when it does, slide the
  // shrunken box back over the arrow (inside its own corridor), rather than
  // leave a tail reaching out of the balloon it belongs to.
  if (input.arrowX !== null && !input.isBox
    && (input.arrowX < box.x || input.arrowX > box.x + box.width)) {
    box.x = Math.max(
      bounds.left, Math.min(input.arrowX - box.width / 2, bounds.right - box.width),
    );
  }

  const routeRgn: RouteRgn = {
    left: box.x, right: box.x + box.width, bottom: box.y + box.height,
  };
  // A balloon hanging that low leaves its own tail no room.
  if (routeRgn.bottom > freeRect.bottom - MIN_HOOK_HEIGHT * scale) return null;

  adjustRouteRgns(input, laid, routeRgn);
  return { input, box, lines: measured.lines, routeRgn };
}

/**
 * How wide this balloon wants to be, and where along x it wants to sit.
 * `bounds` is this balloon's pre-allocated {@link speakerCorridors} span (or
 * `freeRect` itself for a caption/bodiless speaker, which claims none) — the
 * ceiling the width roll and the straddle both work within, so a speaker
 * sharing the stage can never estimate itself into a neighbour's half.
 */
function getCloudEstimate(
  input: BalloonInput, laid: readonly LaidBalloon[], freeRect: Rect, bounds: Rect,
  random: () => number, scale = 1,
): Rect {
  const len = input.ctx.measureText(input.text).width;
  const area = AREA_FUDGE * len * 2 * (LINE_HEIGHT * scale);
  const maxWidth = bounds.right - bounds.left;

  let goalWidth: number;
  if (len <= ONE_LINE_THRESHOLD * scale) {
    goalWidth = len; // short enough to stay on one line
  } else {
    // The height this balloon could use if it grew down to the hook line.
    const potentialHeight = freeRect.bottom - lowestPreviousBottom(laid, freeRect.top)
      + MIN_HOOK_HEIGHT * scale;
    const minWidth = Math.max(area / potentialHeight, widestWord(input.ctx, input.text));
    // Skewed toward maxWidth: a uniform roll picks "too narrow" as often as
    // "wide enough", and a narrow early balloon wraps to more lines, grows
    // taller, and squeezes whatever balloon comes after it down into the
    // speaker's head. Squaring the roll still allows a narrow balloon
    // (variety), but makes it the rarer outcome instead of a coin flip.
    goalWidth = minWidth + (1 - random() ** 2) * (maxWidth - minWidth);
  }

  const widthFudge = WIDTH_FUDGE * scale;
  goalWidth = Math.min(goalWidth + widthFudge, maxWidth);
  goalWidth = Math.min(goalWidth, len + widthFudge); // never wider than the text

  let left: number;
  if (input.isBox || input.arrowX === null) {
    left = freeRect.left;
  } else {
    // Straddle the speaker: the balloon's left is rolled inside
    // [arrowX - goalWidth, arrowX], which guarantees the span covers arrowX
    // so the tail drops straight, then clamped into this speaker's own
    // corridor rather than the whole free rect.
    const leftLimit = input.arrowX - goalWidth;
    let startX = leftLimit + random() * (input.arrowX - leftLimit);
    if (startX < bounds.left) startX = bounds.left;
    if (startX + goalWidth > bounds.right) startX = bounds.right - goalWidth;
    left = startX;
  }
  return { left, right: left + goalWidth, top: freeRect.top, bottom: freeRect.bottom };
}

/**
 * Shrink or shift `brect` into the gap left by the corridors already
 * claimed, then drop its top below whatever is already in the way. Mutates
 * `brect`. Returns whether anything actually pushed the top down, which
 * decides whether the balloon docks flush to the free rect's top.
 */
function getInterveningBBox(
  input: BalloonInput, laid: readonly LaidBalloon[], freeRect: Rect, brect: Rect, scale = 1,
): boolean {
  const toPtX = input.arrowX ?? freeRect.left;

  let mostLeft = freeRect.left;
  let mostRight = freeRect.right;
  for (const prev of laid) {
    const { leftAllowance, rightAllowance } = queryRouteRgn(prev, toPtX, scale);
    mostLeft = Math.max(leftAllowance, mostLeft);
    mostRight = Math.min(rightAllowance, mostRight);
  }

  if (mostLeft > brect.left || mostRight < brect.right) { // can't be placed as is
    const clearance = mostRight - mostLeft;
    if (clearance >= brect.right - brect.left) { // shift it
      const delta = mostLeft > brect.left ? mostLeft - brect.left : mostRight - brect.right;
      brect.left += delta;
      brect.right += delta;
    } else { // grab maximal clearance
      brect.left = mostLeft;
      brect.right = mostRight;
    }
  }

  // Then the top: below the bottom of anything overlapping in x, and below
  // the top of anything clear of it.
  brect.top = freeRect.top;
  for (const prev of laid) {
    const cloud = prev.box;
    if (cloud.x + cloud.width < brect.left) { // clear to one side — tuck alongside
      brect.top = Math.max(brect.top, cloud.y);
    } else {
      // overlapping balloons nest a little instead of stacking flush.
      brect.top = Math.max(brect.top, cloud.y + cloud.height - DOCK_DELTA);
    }
  }
  return brect.top > freeRect.top;
}

/** The balloon whose ink reaches furthest down the panel. */
function lowestPreviousBottom(laid: readonly LaidBalloon[], lowY: number): number {
  let lowest = lowY;
  for (const prev of laid) lowest = Math.max(lowest, prev.box.y + prev.box.height);
  return lowest;
}

/**
 * How far a *new* balloon aiming at `otherToX` may extend before it would
 * block this one's tail. A balloon only defends the side its own speaker is
 * on, and never lets its corridor be squeezed below {@link MIN_ROUTE_WIDTH}.
 * A caption defends nothing, and so does a balloon whose speaker has no body
 * on stage: neither drops a tail.
 */
function queryRouteRgn(
  prev: LaidBalloon, otherToX: number, scale = 1,
): { leftAllowance: number; rightAllowance: number } {
  if (prev.input.isBox || prev.input.arrowX === null) {
    return { leftAllowance: -LARGE, rightAllowance: LARGE };
  }
  const toX = prev.input.arrowX;
  const minRouteWidth = MIN_ROUTE_WIDTH * scale;
  if (otherToX > toX) {
    return {
      leftAllowance: Math.max(toX, prev.routeRgn.left + minRouteWidth),
      rightAllowance: LARGE,
    };
  }
  return {
    leftAllowance: -LARGE,
    rightAllowance: Math.min(toX, prev.routeRgn.right - minRouteWidth),
  };
}

/**
 * The balloon just placed carves its own span out of every corridor claimed
 * before it, so the balloons that follow are squeezed by the accumulated
 * result rather than by the original rects.
 */
function adjustRouteRgns(
  input: BalloonInput, laid: readonly LaidBalloon[], routeRgn: RouteRgn,
): void {
  const toX = input.arrowX;
  if (toX === null) return; // no tail, nothing to route around
  for (const prev of laid) {
    if (prev.input.arrowX === null) continue;
    if (toX > prev.input.arrowX) prev.routeRgn.right = Math.min(prev.routeRgn.right, routeRgn.left);
    else prev.routeRgn.left = Math.max(prev.routeRgn.left, routeRgn.right);
  }
}

/**
 * Give the balloon the whole free rect, split off whatever hangs past the
 * bottom, and dock it at the top. Only ever reached for a lone balloon in an
 * otherwise empty panel — the case where refusing would achieve nothing.
 */
function forceFitBalloon(input: BalloonInput, freeRect: Rect, scale = 1): LayoutResult {
  const width = freeRect.right - freeRect.left;
  const split = splitHeight(input.ctx, { balloon: input.kind, text: input.text }, width, freeRect.bottom - freeRect.top, scale);
  const measured = measureAtWidth(input.ctx, { balloon: input.kind, text: split.text }, width, scale);
  const box: BalloonBox = {
    x: freeRect.left, y: freeRect.top + TOP_BORDER * scale,
    width: measured.width, height: measured.height,
  };
  return {
    fits: true,
    balloons: [{
      input: { ...input, text: split.text },
      box,
      lines: measured.lines,
      routeRgn: { left: box.x, right: box.x + box.width, bottom: box.y + box.height },
    }],
    leftover: split.rest,
  };
}
