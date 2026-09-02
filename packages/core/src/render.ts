/**
 * A panel, drawn. The renderer is a pure function of a {@link Panel} plus the
 * cast: it reads no external state, which is what makes it testable in Node
 * without a caller-side game loop or session — a shot arrives as a name
 * (`establishing`, `close-up`) chosen by the caller, and this file decides
 * what that shot looks like at the current panel size.
 */

import type { Body, CameraPreset, Line, Panel } from "@toonstrip/schema";
import { drawFigure, figureFor, newCycle, type Cast, type Figure, type PoseCycle } from "./figure.js";
import type { EmotionOption } from "./emotion.js";
import { balloonFont, COMIC_FONT_FAMILY, drawBalloon, measureBalloon, type BalloonBox } from "./balloon.js";
import {
  canvasMetrics, layoutBalloons, type BalloonInput, type Rect,
} from "./balloon-layout.js";
import { UNIT } from "./layout.js";

/** The bodiless caption channel — a line with no speaking body. */
export const CAPTION = "caption";

/** A camera preset, as the numbers a render needs. */
type Shot = {
  /** How much of the backdrop is visible behind the figures. */
  backdrop: number;
} & (
  /** Figure height as a fraction of panel height — the ordinary case. */
  | {
    fill: number;
    /** Vertical framing: 1 shows the whole figure, lower crops toward the head. */
    reveal: number;
    headFill?: never; headTop?: never;
  }
  /**
   * *Head* height as a fraction of panel height, for a rung tight enough
   * that the head is the shot. Not interchangeable with `fill`, which scales
   * by body height — a family of characters with different head-to-body
   * ratios would get a different shot per character from `fill` alone.
   */
  | {
    headFill: number;
    /** Where the head-top sits, as a fraction of panel height. */
    headTop: number;
    fill?: never; reveal?: never;
  }
);

/** The six camera presets, as framing. */
const SHOTS: Record<CameraPreset, Shot> = {
  // Tight on the subject: the head fills the frame and the body is cropped
  // away. Carries no balloon, so nothing else holds the head to one size.
  reaction: { headFill: 0.54, headTop: 0.27, backdrop: 0.18 },
  // A new location is the one moment the backdrop is the subject.
  establishing: { fill: 0.5, reveal: 1, backdrop: 1 },
  // A location already seen: both figures, small, the backdrop incidental.
  wide: { fill: 0.58, reveal: 1, backdrop: 0.9 },
  "close-up": { fill: 1.35, reveal: 0.62, backdrop: 0.5 },
  "over-shoulder": { fill: 0.86, reveal: 0.78, backdrop: 0.6 },
  medium: { fill: 0.78, reveal: 0.95, backdrop: 0.75 },
};

/**
 * Panel scale is capped rather than free: this art is roughly 400x400 at
 * native size, so the common case on any real viewport is downscaling, and
 * the narrow risk is a large panel blowing a figure up into its own pixels.
 */
const MAX_SCALE = 1.6;

/**
 * When a panel carries a speech or thought balloon, no figure may grow wider
 * than this fraction of the panel — a speech balloon straddles the head from
 * above, so it needs to be wider than the head to sit over it and still
 * read. Left uncapped on a panel with no such balloon (a `reaction` beat,
 * whose whole point is a face that fills the frame).
 */
export const MAX_FIGURE_WIDTH = 0.55;

/**
 * When a panel carries a speech or thought balloon, no head may grow taller
 * than this fraction of the panel — `fill` scales a figure by its *body*
 * height, but what a reader reads as "how close is this" is head size, and
 * heads vary as a fraction of figure height across a cast. This is a
 * per-figure clamp on top of `fill`, binding hardest at `close-up`.
 */
export const MAX_HEAD_HEIGHT = 0.38;

/**
 * Reserved band at the top of the panel for a straddling speech balloon and
 * its tail. A speech balloon sits above its speaker and drops a near-
 * vertical tail, which only works if the head is far enough down to leave
 * room — so when such a balloon is present, a figure is pushed down until
 * its head-top clears this fraction of the panel height.
 */
export const BALLOON_HEADROOM = 0.44;

/** A laid-out body: its speaker id, figure, and placement in panel space. */
export interface PlacedBody {
  speaker: string;
  figure: Figure;
  x: number;
  y: number;
  scale: number;
  mirror: boolean;
}

export interface RenderOptions {
  /**
   * Per-character pose cycles. Owned by the caller so that re-rendering the
   * same panel (a resize, a re-paint) is idempotent, while a *new* panel
   * advances the cycle. Without this split, a resize would silently redraw
   * every panel with different bodies.
   */
  cycles?: Map<string, PoseCycle>;
  /**
   * Somewhere to record what this render placed. Purely an output: the
   * renderer reads nothing from it and draws the same pixels whether or not
   * it is passed. Useful for a visual-diff gate: the geometry that produced
   * a change says *what* moved, which a pixel hash alone cannot.
   */
  trace?: PanelTrace;
}

/** What a render placed, in panel space. Filled in by {@link RenderOptions.trace}. */
export interface PanelTrace {
  bodies: Array<{ speaker: string; x: number; y: number; scale: number; mirror: boolean }>;
  balloons: Array<{
    speaker: string;
    box: BalloonBox;
    /** How the text broke — the count is enough to spot a re-wrap. */
    lines: number;
    /** Where the tail points, or `null` for a balloon that grows none. */
    tail: { x: number; y: number } | null;
  }>;
  /** True when the balloon driver refused the panel and the stack fallback drew it. */
  stacked: boolean;
}

/** A gesture sentinel angle per {@link Body.pose} value — outside the emotion wheel's metric. */
const GESTURE_ANGLE: Record<NonNullable<Body["pose"]>, number> = {
  wave: 1001,
  point: 1002,
  shrug: 1005,
};

/**
 * The priority-ordered emotion options a body's pose selection reads. A
 * gesture (if present) is offered first — it only ever resolves a torso —
 * and the body's own emotion is always offered too, so the face still
 * expresses it even while the torso gestures.
 */
function emotionOptionsFor(body: Body): EmotionOption[] {
  const options: EmotionOption[] = [{ ...body.emotion, priority: 1 }];
  if (body.pose) options.unshift({ angle: GESTURE_ANGLE[body.pose], intensity: 1, priority: 2 });
  return options;
}

export function renderPanel(
  ctx: CanvasRenderingContext2D, panel: Panel, cast: Cast,
  width: number, height: number, options: RenderOptions = {},
): void {
  const shot = SHOTS[panel.camera ?? "medium"];
  const cycles = options.cycles ?? new Map<string, PoseCycle>();
  // Every fixed-CSS-px layout constant (font size, line height, chrome,
  // margins) is expressed at native `UNIT` size and multiplied out by this
  // factor. Without it a panel rendered smaller than native — the common
  // case, since `layoutStrip` only ever shrinks to fit a real container, see
  // `layout.ts` — reads its own text and chrome as relatively *larger* than
  // native did, which starves the balloon layout of room it would have had
  // at native size. See `WORKLOG.md` v0.7.11.
  const uiScale = width / UNIT.width;
  // A speech or thought balloon needs a column beside the head; a caption is
  // a top box and does not, so a caption-only panel never shrinks its figures.
  const hasColumnBalloon = panel.speakers.some((line) => line.balloon !== "caption");
  const widthCap = hasColumnBalloon ? width * MAX_FIGURE_WIDTH : Infinity;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  if (panel.dark) drawDarkness(ctx, width, height);
  else drawBackdrop(ctx, cast, width, height, shot, panel.backdrop);

  const bodies = selectFigures(panel, cast, cycles);

  const placed = layoutAvatars(bodies, width, height, shot, widthCap);

  // Reserve headroom for a straddling speech balloon: push each figure down
  // until its head-top clears the top band, so the balloon has room to sit
  // above and drop its tail. Only when such a balloon exists.
  if (hasColumnBalloon) applyHeadroom(placed, height);

  if (options.trace) {
    options.trace.bodies = placed.map(({ speaker, x, y, scale, mirror }) =>
      ({ speaker, x, y, scale, mirror }));
    options.trace.balloons = [];
    options.trace.stacked = false;
  }

  // The figures are laid out in the dark and then not drawn, deliberately,
  // and in that order: balloons are placed *over their speakers*, so
  // skipping the layout would move every balloon in an unlit panel and the
  // tails would point at nothing. Darkness removes what the reader can see,
  // not where anyone is standing.
  if (!panel.dark) {
    for (const item of placed) {
      const sheet = cast.sheets.get(item.speaker);
      if (sheet) drawFigure(ctx, sheet, item.figure, item.x, item.y, item.scale, item.mirror);
    }
  }

  // Metadata, over the figures and under nothing: it owns its band, so it
  // can never be covered by a balloon or a body.
  if (panel.roomTitle !== undefined) drawLocationTitle(ctx, panel.roomTitle, width, uiScale);

  drawBalloons(ctx, panel, width, height, placed, uiScale, options.trace);

  // The panel border last, so nothing overdraws it.
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.restore();
}

/** A body earns the stage if requested, or if it speaks this panel. */
export function isSpeaker(body: Body, speakers: readonly Line[]): boolean {
  if (body.requested) return true;
  return speakers.some((line) => line.speaker === body.character);
}

/**
 * Stage order and facing. Order is stable by insertion (no talk-to graph
 * exists to score a better one). Facing is scored: a body is charged for
 * each neighbour it does not face and each neighbour that does not face it;
 * reduced over a fixed row this means each body faces its **larger side** —
 * the leftmost faces right, the rightmost faces left, and the row turns
 * inward. An exact tie (the middle of an odd row) keeps the rightward default.
 */
export function orderBodies<T>(bodies: readonly T[]): Array<{ body: T; flip: boolean }> {
  const n = bodies.length;
  return bodies.map((body, i) => {
    const left = i;
    const right = n - 1 - i;
    return { body, flip: right < left };
  });
}

/**
 * Reserve the top band for a straddling speech balloon, and keep the head
 * that sits under it small enough to leave a body in frame.
 *
 * 1. Push down to the band: a figure whose head-top is above
 *    {@link BALLOON_HEADROOM} is moved down until it clears. A figure
 *    already below the band is left alone.
 * 2. Cap the head: with the head-top pinned, head size is the whole of "how
 *    close are we", and `shot.fill` scales by *body* height — a poor proxy
 *    across a cast whose head-to-body ratio varies. See {@link MAX_HEAD_HEIGHT}.
 *
 * Only figures the band actually pinned are capped, and they shrink about
 * their own centre so the balloon column stays over them.
 */
export function applyHeadroom(placed: PlacedBody[], height: number): void {
  const minHeadTop = height * BALLOON_HEADROOM;
  const headCap = height * MAX_HEAD_HEIGHT;
  for (const item of placed) {
    if (item.y >= minHeadTop) continue;
    item.y = minHeadTop;
    const head = item.figure.headHeight * item.scale;
    if (head <= headCap) continue;
    const centre = item.x + (item.figure.width * item.scale) / 2;
    item.scale *= headCap / head;
    item.x = centre - (item.figure.width * item.scale) / 2;
  }
}

/**
 * Place N bodies across the panel floor. Each body is scaled to the
 * camera's fill height, normalized to a common target height across the
 * cast. Widths are summed; if the row overruns the panel the whole set is
 * reduced by one factor. Bodies are then spread with equal margins,
 * including the two edges.
 */
export function layoutAvatars(
  bodies: ReadonlyArray<{ body: Body; figure: Figure }>,
  width: number, height: number, shot: Shot, widthCap = Infinity,
): PlacedBody[] {
  const n = bodies.length;
  if (n === 0) return [];

  const ordered = orderBodies(bodies);
  const scales = bodies.map((b) => fit(b.figure, height, shot.fill ?? 0, widthCap, shot.headFill));
  const widths = bodies.map((b, i) => b.figure.width * scales[i]!);
  const sumWidth = widths.reduce((a, w) => a + w, 0);

  // Shrink the whole row to fit when it overruns the panel.
  if (sumWidth > width) {
    const reduction = width / sumWidth;
    for (let i = 0; i < n; i++) {
      scales[i]! *= reduction;
      widths[i]! *= reduction;
    }
  }

  const bodyWidth = widths.reduce((a, w) => a + w, 0);
  const margin = (width - bodyWidth) / (n + 1);
  const placed: PlacedBody[] = [];
  let x = margin;
  for (let i = 0; i < n; i++) {
    const { body, figure } = bodies[i]!;
    const scale = scales[i]!;
    const w = widths[i]!;
    placed.push({
      speaker: body.character, figure, scale, x,
      y: shot.headTop === undefined
        ? height - figure.height * scale * shot.reveal
        : height * shot.headTop,
      mirror: ordered[i]!.flip,
    });
    x += w + margin;
  }
  return placed;
}

/**
 * Who is on stage in this panel, and posed how. Each figure's pose comes
 * from its **own** body's emotion, so N participants pose independently,
 * never sharing one panel emotion. Unknown character ids (no sheet, no
 * manifest entry) are skipped.
 *
 * Exported because it is the step that advances `cycles`, and it takes no
 * width — a caller that needs a panel's round-robin advanced without
 * drawing it (a virtualized strip that stages every panel but paints only
 * the ones on screen) can call this and get exactly what {@link renderPanel}
 * would have consumed. Calling it mutates `cycles`; pass a copy to avoid that.
 */
export function selectFigures(
  panel: Panel, cast: Cast, cycles: Map<string, PoseCycle>,
): Array<{ body: Body; figure: Figure }> {
  const bodies: Array<{ body: Body; figure: Figure }> = [];
  for (const body of panel.bodies) {
    if (!isSpeaker(body, panel.speakers)) continue;
    const avatar = cast.manifest.cast[body.character];
    if (!avatar || !cast.sheets.get(body.character)) continue;
    const figure = figureFor(avatar, emotionOptionsFor(body), cycleFor(cycles, body.character));
    if (figure) bodies.push({ body, figure });
  }
  return bodies;
}

function cycleFor(cycles: Map<string, PoseCycle>, character: string): PoseCycle {
  let cycle = cycles.get(character);
  if (!cycle) {
    cycle = newCycle();
    cycles.set(character, cycle);
  }
  return cycle;
}

export function fit(
  figure: Figure, height: number, fill: number,
  widthCap = Infinity, headFill?: number,
): number {
  // `headFill` replaces the body term rather than joining it as another
  // clamp: it is a different way of asking for the same thing.
  const wanted = headFill === undefined
    ? (height * fill) / figure.height
    : (height * headFill) / figure.headHeight;
  return Math.min(wanted, MAX_SCALE, widthCap / figure.width);
}

/**
 * An unlit panel: the frame is black, and that is the whole drawing. Not a
 * dimmed backdrop and not a silhouette — total darkness means no figures are
 * drawn either, just balloons over a black frame. `#0b0b0b` rather than
 * `#000` so the panel border (a 2px `#000` stroke) still reads as a border
 * against it.
 */
function drawDarkness(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, width, height);
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D, cast: Cast, width: number, height: number,
  shot: Shot, id: string | undefined,
): void {
  ctx.fillStyle = "#fdfcf7";
  ctx.fillRect(0, 0, width, height);

  const image = id ? cast.backdrops.get(id) : undefined;
  if (!image) return;
  // Cover, anchored low: backdrops are square and the horizon typically sits
  // in their lower half, so anchoring to the top would put figures in the
  // sky on any panel wider than it is tall.
  const scale = Math.max(width / 315, height / 315);
  const w = 315 * scale;
  const h = 315 * scale;
  ctx.save();
  ctx.globalAlpha = shot.backdrop;
  ctx.drawImage(image, (width - w) / 2, height - h, w, h);
  ctx.restore();
}

/**
 * Balloons live in the top band; the figures own the bottom — the
 * arrangement that keeps a tail short enough to read. Placement inside that
 * band is the layout driver's ({@link "./balloon-layout.js".layoutBalloons});
 * {@link stackBalloons} is the fallback for the one case the driver has no
 * answer for — a panel it refuses.
 */
function drawBalloons(
  ctx: CanvasRenderingContext2D, panel: Panel, width: number, height: number,
  placed: ReadonlyArray<PlacedBody>, scale: number, trace?: PanelTrace,
): void {
  ctx.font = balloonFont(scale);
  const heads = headGeometry(placed, scale);
  const free = balloonRect(width, height, panel.roomTitle !== undefined, scale);

  const inputs: BalloonInput[] = panel.speakers.map((balloon) => ({
    speaker: balloon.speaker,
    isBox: balloon.balloon === "caption",
    // A caption points at nobody; so does a line whose speaker has no body
    // on stage. Both are placed at the free rect's left edge and block no route.
    arrowX: balloon.speaker === CAPTION
      ? null
      : (heads.anchors.get(balloon.speaker)?.x ?? null),
    text: balloon.text,
    metrics: canvasMetrics(ctx, balloon, scale),
  }));

  const laid = layoutBalloons(inputs, free, undefined, scale);
  if (!laid.fits) {
    if (trace) trace.stacked = true;
    stackBalloons(ctx, panel, width, heads, scale);
    return;
  }

  for (const [i, item] of laid.balloons.entries()) {
    const balloon = panel.speakers[i]!;
    // Force-fit may have shortened the text; draw the lines the driver measured.
    const face = balloon.speaker === CAPTION ? undefined : heads.faceBox.get(balloon.speaker);
    const isSpeech = balloon.balloon === "speech";
    const target = isSpeech && face
      ? headEdgeTip(item.box, face)
      : (heads.anchors.get(balloon.speaker) ?? null);
    drawBalloon(ctx, balloon, item.box, item.lines, target, scale);
    trace?.balloons.push({
      speaker: balloon.speaker, box: item.box, lines: item.lines.length,
      tail: target ? { x: target.x, y: target.y } : null,
    });
  }
}

/** The band balloons may occupy, from the panel's top down to {@link BALLOON_HEADROOM}. */
export function balloonRect(width: number, height: number, titled = false, scale = 1): Rect {
  const margin = BALLOON_MARGIN * scale;
  return {
    left: margin,
    // A location title is metadata drawn over the top-left corner, so the
    // band gives way to it rather than a balloon landing on it.
    top: margin + (titled ? TITLE_HEIGHT * scale : 0),
    right: width - margin,
    bottom: height * BALLOON_HEADROOM,
  };
}

/** The inset from the panel border, at native scale. */
export const BALLOON_MARGIN = 10;

/**
 * The location title's height at native scale, and the type it is set in.
 * Not a balloon: no tail, no draw order.
 */
export const TITLE_HEIGHT = 22;
const TITLE_FONT_SIZE = 12;
const TITLE_FONT_FAMILY = COMIC_FONT_FAMILY;
/** The location title's font at native scale — what `document.fonts.load` should be asked for. */
export const TITLE_FONT = `bold ${TITLE_FONT_SIZE}px ${TITLE_FONT_FAMILY}`;
const TITLE_PAD = 6;

/** Draw the location title, clipped to the panel's width. */
export function drawLocationTitle(
  ctx: CanvasRenderingContext2D, title: string, width: number, scale = 1,
): void {
  ctx.save();
  ctx.font = `bold ${TITLE_FONT_SIZE * scale}px ${TITLE_FONT_FAMILY}`;
  const margin = BALLOON_MARGIN * scale;
  const pad = TITLE_PAD * scale;
  const titleHeight = TITLE_HEIGHT * scale;
  const text = ctx.measureText(title).width > width - margin * 2 - pad * 2
    ? ellipsize(ctx, title, width - margin * 2 - pad * 2)
    : title;
  const boxWidth = ctx.measureText(text).width + pad * 2;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(margin, margin, boxWidth, titleHeight);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";
  ctx.fillText(text, margin + pad, margin + titleHeight / 2);
  ctx.restore();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
}

interface Face { left: number; right: number; top: number; bottom: number; }

interface HeadGeometry {
  anchors: Map<string, { x: number; y: number }>;
  faceBox: Map<string, Face>;
  faces: Face[];
}

/** Each on-stage head as a tail anchor and a keep-out box, in panel space. */
function headGeometry(placed: ReadonlyArray<PlacedBody>, scale = 1): HeadGeometry {
  // A balloon over a face is the one thing comics never do, so balloons
  // route *around* these; a speech tail lands on the box's near edge.
  const anchors = new Map<string, { x: number; y: number }>();
  const faceBox = new Map<string, Face>();
  const faces: Face[] = [];
  for (const item of placed) {
    // A mirrored figure's face is at `width - faceX` from its left edge, so
    // the balloon tail must follow it or it would point at the back of the head.
    const faceX = item.mirror ? item.figure.width - item.figure.faceX : item.figure.faceX;
    const ax = item.x + faceX * item.scale;
    const headH = item.figure.headHeight * item.scale;
    anchors.set(item.speaker, {
      x: ax,
      // The crown anchor, used by *thought* balloons. Depth is a capped
      // fraction of head height so the cap stays in the hairline at any
      // scale — a speech tail does not use this, it lands via {@link headEdgeTip}.
      y: item.y + Math.min(headH * 0.2, 16 * scale),
    });
    const halfW = headH * 0.44;
    const box = { left: ax - halfW, right: ax + halfW, top: item.y, bottom: item.y + headH };
    faceBox.set(item.speaker, box);
    faces.push(box);
  }
  return { anchors, faceBox, faces };
}

/** The floor a corridor may not shrink past, even between two close heads, at native scale. */
const MIN_CORRIDOR_WIDTH = 80;

/**
 * The horizontal room a balloon straddling `ownFace` may use: bounded by the
 * panel margins and, on each side, the midpoint to the nearest *other* head
 * still on stage. A balloon confined to this can never grow wide enough to
 * cover a neighbour's head or route a tail across a neighbour's — the two
 * ways {@link stackBalloons} let a straddling balloon collide with anyone but
 * its own speaker. Floored at {@link MIN_CORRIDOR_WIDTH} so two heads placed
 * close together still leave a balloon buildable, at the cost of letting it
 * bleed a little into the neighbour's half.
 */
function speakerCorridor(
  ax: number, ownFace: Face, faces: readonly Face[], width: number, scale = 1,
): { left: number; right: number } {
  const margin = BALLOON_MARGIN * scale;
  const minWidth = MIN_CORRIDOR_WIDTH * scale;
  let left = margin;
  let right = width - margin;
  for (const f of faces) {
    if (f === ownFace) continue;
    const mid = (ax + (f.left + f.right) / 2) / 2;
    if (f.left + f.right < ax * 2) left = Math.max(left, mid);
    else right = Math.min(right, mid);
  }
  if (right - left < minWidth) {
    const centre = (left + right) / 2;
    left = Math.max(margin, centre - minWidth / 2);
    right = Math.min(width - margin, left + minWidth);
  }
  return { left, right };
}

/**
 * The pre-driver vertical stack, kept as {@link drawBalloons}'s fallback for
 * a panel the layout driver refuses. Not the driver's algorithm — nothing
 * but the fallback path calls it.
 */
function stackBalloons(
  ctx: CanvasRenderingContext2D, panel: Panel, width: number, heads: HeadGeometry, scale = 1,
): void {
  const { anchors, faceBox, faces } = heads;
  const faceCentre = (f?: { left: number; right: number }) =>
    f ? (f.left + f.right) / 2 : null;
  const margin = BALLOON_MARGIN * scale;

  // Empty margins, still used to float a *thought* aside off in open space;
  // a *speech* balloon straddles its speaker.
  const faceLeft = faces.length > 0 ? Math.min(...faces.map((f) => f.left)) : width;
  const faceRight = faces.length > 0 ? Math.max(...faces.map((f) => f.right)) : 0;
  const asideSide: "left" | "right" =
    width - margin - faceRight >= faceLeft - margin ? "right" : "left";

  // The panel's balloons in draw order, each bound to its speaker's head:
  // the caption and any bodiless speaker route with no anchor, the rest straddle.
  const queue = panel.speakers.map((balloon) => {
    const face = balloon.speaker === CAPTION ? undefined : faceBox.get(balloon.speaker);
    const anchor = balloon.speaker === CAPTION ? null : (anchors.get(balloon.speaker) ?? null);
    return { balloon, anchor, face, headX: faceCentre(face) };
  });

  // The general-purpose cap: balloons are laid out in a strict vertical
  // sequence (`y` only grows below), so nothing here needs a narrower cap to
  // avoid *balloon-vs-balloon* collision. A straddling speech balloon is
  // different: it is deliberately centred over its own speaker's head, and a
  // panel with two or more bodies on stage can put that head close enough to
  // a neighbour's that a full-width balloon spills across the gap and covers
  // the *other* head, or drops a tail that crosses the other balloon's — the
  // one thing comics never do. An earlier version narrowed the shared cap to
  // `width * 0.66` for that case, which bought nothing (it only guarded
  // against balloon-vs-balloon, not balloon-vs-head) and just made a wrapped
  // balloon taller, so it was widened back; the actual fix is
  // {@link speakerCorridor}, capping each *straddling* balloon to the room
  // around its own head instead of narrowing every balloon regardless of
  // shape. See UPSTREAM_SYNC.md.
  const cap = width - margin * 2;
  // The tail is capped, not stretched: a balloon docks near its head with a
  // short tail. We pin balloons to the panel top while figures stand at the
  // bottom, so `TAIL_MAX` drops a tailed balloon toward its head until the
  // tail is no longer than this, leaving the empty space above it.
  const TAIL_MAX = 70 * scale;
  const gap = 8 * scale;

  let y = gap;
  for (const item of queue) {
    const balloon = item.balloon;
    const isSpeech = balloon.balloon === "speech";
    // A thought balloon's scallops bulge outward; keep that bulge clear too.
    const bulge = balloon.balloon === "thought" ? 14 * scale : 0;
    // A straddling speech balloon is confined to the corridor around its own
    // head before it is even measured, so its wrap can never grow wide
    // enough to reach a neighbour's head or tail; every other kind keeps the
    // full-width cap.
    const corridor = isSpeech && item.headX !== null && item.face
      ? speakerCorridor(item.headX, item.face, faces, width, scale)
      : null;
    const measured = measureBalloon(
      ctx, balloon, corridor ? Math.min(cap, corridor.right - corridor.left) : cap, scale,
    );
    // Drop a tailed balloon toward its speaker so the tail stays short. The
    // head top is the face box's top for speech, the crown anchor for a thought.
    const headTopY = item.face ? item.face.top : (item.anchor ? item.anchor.y : null);
    if (headTopY !== null && balloon.balloon !== "caption") {
      y = Math.max(y, headTopY - TAIL_MAX - measured.height);
    }
    let x: number;
    if (corridor && item.headX !== null) {
      // Straddle the speaker: the head's x sits inside the balloon's span,
      // so the bottom tail drops straight to it. The symmetric midpoint of
      // the legal range is taken deterministically rather than rolled, and
      // clamped to the corridor rather than the whole panel so it can't
      // cross into a neighbouring head's territory.
      x = Math.max(corridor.left, Math.min(item.headX - measured.width / 2, corridor.right - measured.width));
    } else if (balloon.balloon === "caption") {
      x = margin; // a caption is a top box, pinned left, spoken by nobody.
    } else {
      // A thought aside floats in the roomier margin, clear of every face.
      x = asideSide === "right" ? width - measured.width - margin : margin;
      x = clearOfFaces(x, y, measured.width, measured.height, bulge, faces, width, scale);
    }
    const box: BalloonBox = { x, y, width: measured.width, height: measured.height };
    // A speech tail lands on the head's silhouette nearest the balloon (its
    // crown, since the balloon straddles from above); a thought aside keeps
    // the crown anchor.
    const target = isSpeech && item.face ? headEdgeTip(box, item.face) : item.anchor;
    drawBalloon(ctx, balloon, box, measured.lines, target, scale);
    y += measured.height + gap;
  }
}

/**
 * Where a speech tail should end: the point on the head's silhouette (its
 * face keep-out box) nearest the balloon — the crown when the balloon is
 * above, the temple when it is to the side. Aiming at the head's centre
 * would cross the face and land on the nose when the balloon sits beside it.
 */
function headEdgeTip(box: BalloonBox, face: Face): { x: number; y: number } {
  const headCx = (face.left + face.right) / 2;
  // The tail root rides the balloon's bottom edge, as near the head as it fits.
  const rootX = Math.min(Math.max(headCx, box.x), box.x + box.width);
  const rootY = box.y + box.height;
  return {
    x: Math.min(Math.max(rootX, face.left), face.right),
    y: Math.min(Math.max(rootY, face.top), face.bottom),
  };
}

/**
 * Slide a box horizontally until it no longer overlaps any face box, moving
 * it toward whichever side needs less travel and still fits the panel. When
 * the box is too wide to clear at all, it is left where it was and only
 * nudged back inside the panel edges.
 */
export function clearOfFaces(
  x: number, y: number, w: number, h: number, bulge: number,
  faces: ReadonlyArray<{ left: number; right: number; top: number; bottom: number }>,
  width: number, scale = 1,
): number {
  const margin = BALLOON_MARGIN * scale;
  const tailReach = 24 * scale;
  const gap = 6 * scale;
  for (const f of faces) {
    const top = y - bulge;
    const bottom = y + h + bulge + tailReach; // the tail can reach below the box
    if (bottom <= f.top || top >= f.bottom) continue; // clears vertically
    const left = x - bulge;
    const right = x + w + bulge;
    if (right <= f.left || left >= f.right) continue; // already clears horizontally
    const toRight = f.right + bulge + gap - left; // x delta to sit right of the head
    const toLeft = f.left - bulge - gap - right; // (negative) to sit left of it
    const canRight = x + toRight + w + margin <= width;
    const canLeft = x + toLeft >= margin;
    if (canRight && (!canLeft || toRight <= -toLeft)) x += toRight;
    else if (canLeft) x += toLeft;
  }
  return Math.max(margin, Math.min(x, width - w - margin));
}
