/**
 * Balloons: speech, thought, and caption, drawn as a hand-drawn (wavy-edged)
 * outline rather than a plain rounded rect.
 *
 * - `speech` — a balloon with a tail rooted on its speaker's head.
 * - `thought` — a scalloped cloud with a bubble-trail tail.
 * - `caption` — a plain box, spoken by nobody, no tail.
 */
import type { Line } from "@toonstrip/schema";

export interface BalloonBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where the tail should point: the figure's face anchor, in panel space. */
export interface TailTarget {
  x: number;
  y: number;
}

/**
 * The font every balloon is measured and drawn in, at native (`scale = 1`)
 * size. Exported because measurement happens in more than one place (the
 * renderer, and any caller-side pre-check), and both must break lines
 * identically. All of this module's other pixel constants (padding, line
 * height, tail geometry) are likewise native-scale values — every function
 * that uses them takes a `scale` factor (the caller's actual panel width
 * over {@link "./layout.js".UNIT}'s width) and multiplies them out, so a
 * panel rendered smaller than native wraps and chromes text exactly as it
 * would have at native size, just scaled down, rather than the same fixed
 * CSS px reading relatively larger the further a real embed shrinks below
 * native. See `WORKLOG.md` v0.7.11.
 */
const BALLOON_FONT_SIZE = 13;
/**
 * The family stack every piece of comic text (balloons, location titles) is
 * set in. Latin glyphs come from Comic Sans / Comic Neue. Neither has Hangul,
 * so the browser walks the rest of the list per glyph: Noto Sans KR when the
 * page provides it (a webfont; `@toonstrip/element` waits for it before
 * painting), then the platform Korean sans faces (macOS/iOS, Windows), then
 * the generic. Without the named Korean faces, Hangul fell through to
 * `cursive`, which Windows maps to Gungseo — a brush script — and other
 * platforms to whatever they consider cursive. Order matters: the Korean
 * faces sit after the comic faces so Latin text never changes.
 */
export const COMIC_FONT_FAMILY =
  '"Comic Sans MS", "Comic Neue", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", ui-rounded, cursive';
const BALLOON_FONT_FAMILY = COMIC_FONT_FAMILY;
export const BALLOON_FONT = `${BALLOON_FONT_SIZE}px ${BALLOON_FONT_FAMILY}`;

/** The font string at `scale` — what the caller sets `ctx.font` to before measuring or drawing. */
export function balloonFont(scale = 1): string {
  return `${BALLOON_FONT_SIZE * scale}px ${BALLOON_FONT_FAMILY}`;
}

const PADDING = 10;
/**
 * A thought balloon's scallops bulge outward from its text box, so the text
 * is inset by a bump radius or the first/last words sit under the cloud's
 * own outline. A speech balloon and a caption need no such allowance.
 */
const THINK_INSET = 9;
export const LINE_HEIGHT = 15;
/** How far a tail must clear its balloon's edge before angling toward its speaker. */
const TAIL_MIN_EXIT = 2;

/**
 * The balloon outline ripples instead of running dead straight: each edge is
 * walked and alternate waypoints pushed outward along the edge normal, then
 * the whole ring (corners included) is splined through one closed curve —
 * what makes the outline read hand-drawn instead of a rounded rect.
 *
 * `WAVE_INTERVAL` is the spacing between bumps, `WAVE_AMP` their outward depth.
 */
const WAVE_INTERVAL = 22;
const WAVE_AMP = 6;

/** Cardinal-spline tension for the outline — 0.5 is the Catmull-Rom value. */
const SPLINE_TENSION = 0.5;

/** Below this one-line width, a balloon stays a single line rather than being wrapped for shape. */
export const ONE_LINE_THRESHOLD = 100;
/** The width:height a wrapped balloon trends toward — square-ish but a touch wide. */
const TARGET_ASPECT = 1.9;
/** Ink-area fudge factor used when estimating a compact wrap width. */
export const AREA_FUDGE = 1.3;
/**
 * How far the compact goal is pushed toward the free width — close to it
 * (was 0.5, splitting the difference) since a balloon that stays compact
 * wraps to more lines, and this is the fallback path (`stackBalloons`,
 * `render.ts`) used whenever the multi-balloon driver refuses a panel; a
 * taller balloon there is more likely to grow into its own speaker's head.
 * See UPSTREAM_SYNC.md.
 */
const WIDTH_BIAS = 0.85;

/** Widest single word, the floor a balloon may not wrap below. */
export function widestWord(ctx: CanvasRenderingContext2D, text: string): number {
  const words = text.match(/\S+/g) ?? [];
  return words.length === 0 ? 0 : Math.max(...words.map((w) => ctx.measureText(w).width));
}

/**
 * The width a balloon *wants* to wrap at. Short text stays one line; longer
 * text is sized from its ink area so the balloon is compact rather than a
 * wide flat strip, floored by the widest word and capped at the free width.
 * Wrapping at this width is what makes a balloon read as a balloon shape
 * rather than a text block.
 */
export function goalWidth(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, scale = 1,
): number {
  const oneLine = ctx.measureText(text).width;
  if (oneLine <= ONE_LINE_THRESHOLD * scale) return Math.min(oneLine, maxWidth);
  // area ~= ink area laid on one line; for a box of width W the height is ~= area/W,
  // so aspect W/(area/W) = W^2/area = TARGET_ASPECT => W = sqrt(TARGET_ASPECT * area).
  const area = AREA_FUDGE * oneLine * (LINE_HEIGHT * scale);
  const compact = Math.sqrt(TARGET_ASPECT * area);
  // Spread toward the free width, but never past the one-line width.
  const ceiling = Math.min(maxWidth, oneLine);
  const goal = compact + WIDTH_BIAS * (ceiling - compact);
  return Math.min(Math.max(goal, widestWord(ctx, text)), ceiling);
}

/**
 * Greedy fit: pack words onto a line until the next would overflow, then
 * break. A word longer than the whole width is kept intact on its own line
 * rather than split mid-character.
 */
function greedyWrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.match(/\S+/g) ?? []) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

export function measureBalloon(
  ctx: CanvasRenderingContext2D, balloon: Pick<Line, "balloon" | "text">, maxWidth: number,
  scale = 1,
): { lines: string[]; width: number; height: number } {
  const pad = chromeFor(balloon, scale);
  const lineHeight = LINE_HEIGHT * scale;
  const lines = greedyWrap(ctx, balloon.text, goalWidth(ctx, balloon.text, maxWidth - pad * 2, scale));
  const width = Math.min(
    maxWidth,
    Math.max(...lines.map((line) => ctx.measureText(line).width)) + pad * 2,
  );
  return { lines, width, height: lines.length * lineHeight + pad * 2 };
}

/** The chrome a balloon kind puts between its outline and its text, each side, at `scale`. */
export function chromeFor(balloon: Pick<Line, "balloon">, scale = 1): number {
  return (PADDING + (balloon.balloon === "thought" ? THINK_INSET : 0)) * scale;
}

/**
 * Wrap and measure at a width the *caller* chose, rather than at the width
 * {@link goalWidth} would pick. The entry point the multi-balloon layout
 * driver needs, once the free rect and intervening routes have narrowed a
 * balloon's span below its own preferred width.
 */
export function measureAtWidth(
  ctx: CanvasRenderingContext2D, balloon: Pick<Line, "balloon" | "text">, boxWidth: number,
  scale = 1,
): { lines: string[]; width: number; height: number } {
  const pad = chromeFor(balloon, scale);
  const inner = Math.max(1, boxWidth - pad * 2);
  const lines = greedyWrap(ctx, balloon.text, inner);
  const width = Math.min(
    boxWidth,
    Math.max(...lines.map((line) => ctx.measureText(line).width)) + pad * 2,
  );
  return { lines, width, height: lines.length * (LINE_HEIGHT * scale) + pad * 2 };
}

/** Appended to the part of a too-tall balloon that fit, prepended to the rest. */
export const CONTINUATION = "...";

/**
 * Reflow the text at `boxWidth`, keep as many lines as `boxHeight` holds, and
 * hand the rest back for the caller to re-add. Lets a balloon too tall for
 * its free rect force-fit into it and split rather than being refused
 * outright — the layout driver's ({@link "./balloon-layout.js".layoutBalloons})
 * last resort for a lone balloon in an otherwise empty panel.
 *
 * At least one word is always kept: a word that fits nowhere is drawn
 * clipped rather than handing back a leftover identical to the input.
 */
export function splitHeight(
  ctx: CanvasRenderingContext2D, balloon: Pick<Line, "balloon" | "text">,
  boxWidth: number, boxHeight: number, scale = 1,
): { text: string; rest: string | null } {
  const pad = chromeFor(balloon, scale);
  const inner = Math.max(1, boxWidth - pad * 2);
  const lines = greedyWrap(ctx, balloon.text, inner);
  const maxLines = Math.max(1, Math.floor(boxHeight / (LINE_HEIGHT * scale)));
  if (lines.length < maxLines) return { text: balloon.text, rest: null };

  const words = balloon.text.match(/\S+/g) ?? [];
  // Whole lines above the one being broken.
  let kept = lines.slice(0, maxLines - 1)
    .reduce((n, line) => n + (line.match(/\S+/g)?.length ?? 0), 0);
  // ...then as much of that line as fits beside the continuation mark.
  const room = inner - ctx.measureText(CONTINUATION).width;
  let line = "";
  for (const word of lines[maxLines - 1]?.match(/\S+/g) ?? []) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && ctx.measureText(candidate).width > room) break;
    line = candidate;
    kept += 1;
  }
  kept = Math.max(1, Math.min(kept, words.length));
  if (kept >= words.length) return { text: balloon.text, rest: null };
  return {
    text: `${words.slice(0, kept).join(" ")}${CONTINUATION}`,
    rest: `${CONTINUATION}${words.slice(kept).join(" ")}`,
  };
}

/**
 * Draw a balloon in its kind's shape, with a tail toward `target` when the
 * kind has one. Captions do not: a box is the narrator's, spoken by nobody.
 */
export function drawBalloon(
  ctx: CanvasRenderingContext2D, balloon: Pick<Line, "balloon">, box: BalloonBox,
  lines: readonly string[], target: TailTarget | null, scale = 1,
): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 1.5;

  switch (balloon.balloon) {
    case "caption":
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.fill();
      ctx.stroke();
      break;
    case "thought":
      cloud(ctx, box);
      ctx.fill();
      ctx.stroke();
      if (target) bubbleTrail(ctx, box, target, scale);
      break;
    case "speech":
      roundedSpeech(ctx, box, target, scale);
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  const pad = chromeFor(balloon, scale);
  const lineHeight = LINE_HEIGHT * scale;
  for (const [i, line] of lines.entries()) {
    // Centred, so the ragged wrap edge reads as shared between both sides.
    const width = ctx.measureText(line).width;
    ctx.fillText(line, box.x + (box.width - width) / 2, box.y + pad + i * lineHeight);
  }
  ctx.restore();
}

/**
 * A scalloped outline, drawn as one continuous closed path of outward-bulging
 * arcs. Scallop density comes from `box`'s own (already-scaled) dimensions —
 * no separate `scale` needed here, a smaller box naturally gets fewer.
 */
function cloud(ctx: CanvasRenderingContext2D, box: BalloonBox): void {
  const cols = Math.max(4, Math.round(box.width / 26));
  const rows = Math.max(2, Math.round(box.height / 24));
  const rx = box.width / (cols * 2);
  const ry = box.height / (rows * 2);
  const { x, y, width: w, height: h } = box;

  ctx.beginPath();
  ctx.moveTo(x, y);
  // Top edge, left -> right, each scallop bulging up.
  for (let i = 0; i < cols; i++) {
    ctx.arc(x + (w * (i + 0.5)) / cols, y, rx, Math.PI, 2 * Math.PI, false);
  }
  // Right edge, top -> bottom, bulging right.
  for (let i = 0; i < rows; i++) {
    ctx.arc(x + w, y + (h * (i + 0.5)) / rows, ry, -Math.PI / 2, Math.PI / 2, false);
  }
  // Bottom edge, right -> left, bulging down.
  for (let i = cols - 1; i >= 0; i--) {
    ctx.arc(x + (w * (i + 0.5)) / cols, y + h, rx, 0, Math.PI, false);
  }
  // Left edge, bottom -> top, bulging left.
  for (let i = rows - 1; i >= 0; i--) {
    ctx.arc(x, y + (h * (i + 0.5)) / rows, ry, Math.PI / 2, (3 * Math.PI) / 2, false);
  }
  ctx.closePath();
}

/**
 * A thought balloon's tail: a line of bubbles rather than an arrow — the
 * mark that says *interior* at a glance. Three bubbles at even spacing,
 * smallest nearest the speaker.
 */
function bubbleTrail(
  ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget, scale = 1,
): void {
  const from = { x: box.x + box.width / 2, y: box.y + box.height };
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.arc(
      from.x + (target.x - from.x) * t,
      from.y + (target.y - from.y) * t,
      (6 - i * 1.4) * scale, 0, Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
}

interface Pt { x: number; y: number }

/**
 * Walk edge `a->b` and append its outward bumps to `pts`: alternating
 * waypoints, a bump pushed out by `WAVE_AMP` along the edge normal `(nx,ny)`
 * then a point left on the edge, so the outline only ever bulges outward,
 * never pinches in. The corner points that bracket each edge are pushed by
 * the caller; this adds only the between-corner bumps.
 *
 * Below two intervals there are no bumps — the edge stays a straight
 * spline chord.
 */
function pushWaves(
  pts: Pt[], ax: number, ay: number, bx: number, by: number, nx: number, ny: number, scale = 1,
): void {
  const dist = Math.hypot(bx - ax, by - ay);
  const n = Math.floor(dist / (WAVE_INTERVAL * scale));
  if (n < 2) return;
  const ux = (bx - ax) / dist, uy = (by - ay) / dist;
  const seg = dist / n;
  const amp = WAVE_AMP * scale;
  for (let i = 1; i < n; i++) {
    const px = ax + ux * seg * i, py = ay + uy * seg * i;
    // Odd steps bulge out, even steps stay on the edge.
    if (i % 2 === 1) pts.push({ x: px + nx * amp, y: py + ny * amp });
    else pts.push({ x: px, y: py });
  }
}

/**
 * Render a ring of waypoints as one smooth closed (or open) loop: a
 * Catmull-Rom curve through every point, each segment converted to a cubic
 * Bezier with control points `p +/- (next-prev)*t/3`; `t = SPLINE_TENSION`.
 * `open` leaves a gap between the last and first point (the bottom stretch a
 * tail bridges); otherwise the loop closes on itself. Assumes the path is
 * already open and positions the current point itself.
 */
function strokeCardinal(ctx: CanvasRenderingContext2D, pts: readonly Pt[], open: boolean): void {
  const n = pts.length;
  if (n < 2) return;
  const f = SPLINE_TENSION / 3;
  const at = (i: number): Pt =>
    open ? pts[Math.min(Math.max(i, 0), n - 1)]! : pts[(i + n) % n]!;
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  const last = open ? n - 1 : n;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * f, p1.y + (p2.y - p0.y) * f,
      p2.x - (p3.x - p1.x) * f, p2.y - (p3.y - p1.y) * f,
      p2.x, p2.y,
    );
  }
}

/**
 * A speech balloon: a hand-drawn outline with a bowed tail rooted on the
 * bottom edge. The tail always leaves the bottom edge, never a side, its
 * root sliding along that edge to sit under the speaker, bowed as two curves
 * with a sharp tip (kept off the body spline so the point stays crisp). A
 * 45-degree-from-vertical clamp keeps a head off to the side from dragging
 * the tip out past a readable angle.
 */
function roundedSpeech(
  ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget | null, scale = 1,
): void {
  const { x, y, width: w, height: h } = box;
  const right = x + w, bottom = y + h;

  if (!target) {
    // No speaker: one closed ring — top, right, bottom, left — all corners
    // and bumps splined together into a plain blob.
    const ring: Pt[] = [];
    ring.push({ x, y });
    pushWaves(ring, x, y, right, y, 0, -1, scale); // top, bulging up
    ring.push({ x: right, y });
    pushWaves(ring, right, y, right, bottom, 1, 0, scale); // right, bulging right
    ring.push({ x: right, y: bottom });
    pushWaves(ring, right, bottom, x, bottom, 0, 1, scale); // bottom, bulging down
    ring.push({ x, y: bottom });
    pushWaves(ring, x, bottom, x, y, -1, 0, scale); // left, bulging left
    ctx.beginPath();
    strokeCardinal(ctx, ring, false);
    ctx.closePath();
    return;
  }

  // Tail roots ride the bottom edge under the head, far enough from a corner
  // that both roots stay on the flat run.
  const corner = 16 * scale, rootHalf = 9 * scale;
  const root = Math.min(Math.max(target.x, x + corner), right - corner);
  const rootR = root + rootHalf, rootL = root - rootHalf;
  const tipY = Math.max(target.y, bottom + TAIL_MIN_EXIT * scale);
  // 45-degree clamp: the tip's horizontal run may not exceed its vertical
  // drop, so a side speaker cannot flatten the tail.
  const dy = tipY - bottom;
  const tipX = Math.min(Math.max(target.x, root - dy), root + dy);
  const alt = 0.05 * Math.hypot(tipX - root, dy); // bow depth

  // Body ring, open along the bottom between the two roots: start at rootR,
  // run the bottom out to the right corner, up and over and down, back along
  // the bottom to rootL. The tail then bridges rootL->tip->rootR as sharp quads.
  const ring: Pt[] = [];
  ring.push({ x: rootR, y: bottom });
  pushWaves(ring, rootR, bottom, right, bottom, 0, 1, scale); // bottom, right of the tail
  ring.push({ x: right, y: bottom });
  pushWaves(ring, right, bottom, right, y, 1, 0, scale); // right, bulging right
  ring.push({ x: right, y });
  pushWaves(ring, right, y, x, y, 0, -1, scale); // top, bulging up
  ring.push({ x, y });
  pushWaves(ring, x, y, x, bottom, -1, 0, scale); // left, bulging left
  ring.push({ x, y: bottom });
  pushWaves(ring, x, bottom, rootL, bottom, 0, 1, scale); // bottom, left of the tail
  ring.push({ x: rootL, y: bottom });

  ctx.beginPath();
  strokeCardinal(ctx, ring, true); // ends at rootL (current point)
  ctx.quadraticCurveTo((rootL + tipX) / 2 - alt, (bottom + tipY) / 2, tipX, tipY);
  ctx.quadraticCurveTo((tipX + rootR) / 2 + alt, (tipY + bottom) / 2, rootR, bottom);
  ctx.closePath();
}
