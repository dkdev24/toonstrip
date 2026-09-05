/**
 * Source PNGs -> one sprite sheet plus the rect/pose table the renderer
 * reads (`PackedAvatar` in `@toonstrip/core`).
 *
 * Two jobs happen here. **Packing** is mechanical: trim each part to its
 * alpha box, shelf-pack the boxes into one sheet, record the rects.
 *
 * **Join derivation** is the part that can produce a valid-but-wrong pack, so
 * it is deliberately layered (dev plan §14): an explicit anchor in
 * `source.json` wins, else a magenta marker pixel in the art, else the
 * convention — a face joins at the bottom-centre of its drawing (the chin, or
 * the base of a neck stub), a torso at the top-centre of its (the neck line).
 * The join point is derived **once per character, from its NEUTRAL pose**, and
 * reused for every other pose in canvas space. That is why the spec asks for
 * the head and body to stay put across poses: a raised arm moves a torso's
 * alpha box, but must not move its neck.
 */

import type { PackedAvatar, PackedPart } from "@toonstrip/core";
import { createCanvas, toCanvas, type Box } from "./image.js";
import type { MeasuredPart } from "./measure.js";
import type { SourceCharacter } from "./source.js";
import { NO_SHIFT } from "./register.js";
import { angleFor, type AssetImageSpec, type PartKind } from "./spec.js";

/** Sheet width to pack against. Rows are laid out left to right within it. */
export const SHEET_WIDTH = 1024;

export interface JoinPoint {
  x: number;
  y: number;
  /** Where the number came from, for the build report and the preview. */
  origin: "anchor" | "marker" | "convention";
}

export interface PackedCharacter {
  id: string;
  avatar: PackedAvatar;
  sheet: Buffer;
  joins: Partial<Record<PartKind, JoinPoint>>;
  /** Trimmed rects keyed by source filename — used by the join preview. */
  rects: Map<string, Box>;
}

function reference(parts: MeasuredPart[], kind: PartKind): MeasuredPart | undefined {
  const ofKind = parts.filter((p) => p.part.kind === kind && p.box);
  return ofKind.find((p) => p.part.emotion === "NEUTRAL") ?? ofKind[0];
}

function conventionJoin(kind: PartKind, box: Box): { x: number; y: number } {
  const x = box.x + box.width / 2;
  // A face hangs from its chin; a torso is entered at its neck line.
  const y = kind === "torso" ? box.y : box.y + box.height;
  return { x, y };
}

export function resolveJoin(
  character: SourceCharacter,
  parts: MeasuredPart[],
  kind: PartKind,
  spec: AssetImageSpec,
): JoinPoint | null {
  const ref = reference(parts, kind);
  if (!ref || !ref.box) return null;

  const declared = character.anchors?.[kind as "face" | "torso"];
  if (declared) {
    const scale = spec.cell / ref.native.width;
    return { x: declared.x * scale, y: declared.y * scale, origin: "anchor" };
  }
  if (ref.marker) return { ...ref.marker, origin: "marker" };
  return { ...conventionJoin(kind, ref.box), origin: "convention" };
}

interface Placed {
  measured: MeasuredPart;
  box: Box;
  rect: Box;
}

/** Shelf packer: tallest first, wrapped at {@link SHEET_WIDTH}. */
function shelfPack(parts: MeasuredPart[]): { placed: Placed[]; width: number; height: number } {
  const boxed = parts
    .filter((p): p is MeasuredPart & { box: Box } => p.box !== null)
    .map((p) => ({ measured: p, box: p.box }))
    .sort((a, b) => b.box.height - a.box.height || b.box.width - a.box.width);

  const width = Math.max(SHEET_WIDTH, ...boxed.map((b) => b.box.width), 1);
  const placed: Placed[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const item of boxed) {
    if (x > 0 && x + item.box.width > width) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    placed.push({ ...item, rect: { x, y, width: item.box.width, height: item.box.height } });
    x += item.box.width;
    rowHeight = Math.max(rowHeight, item.box.height);
  }
  return { placed, width, height: y + rowHeight };
}

function packedPart(
  placed: Placed,
  index: number,
  join: JoinPoint,
  extraCy: number,
  spec: AssetImageSpec,
): PackedPart {
  const { measured, box, rect } = placed;
  // A sheet cell carries its registration against the character's NEUTRAL
  // cell (`./register.js`), so a pose drawn a few pixels off shares the
  // reference join corrected by that shift rather than deriving its own.
  // Per-pose files have no shift, which is M14's behaviour exactly.
  //
  // Registration is measured in the sliced cell's own pixels, while the join
  // and the trimmed box are in cell-size (`spec.cell`) pixels, so the shift
  // has to be rescaled the same way the raster was.
  const align = measured.part.align ?? NO_SHIFT;
  const scale = spec.cell / measured.native.width;
  const cx = Math.round(join.x + align.dx * scale - box.x);
  const cy = Math.round(join.y + align.dy * scale - box.y + extraCy);
  return {
    kind: measured.part.kind,
    index,
    emotion: measured.part.emotion,
    angle: angleFor(measured.part.emotion),
    intensity: measured.part.intensity,
    cx,
    cy,
    cxDelta: 0,
    cyDelta: 0,
    // The balloon tail attaches at the mouth, which sits on the face's own
    // vertical centre line — the same x the join uses.
    x: cx,
    figure: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    aura: null,
  };
}

/**
 * Packs one character. Errors are the caller's problem: run
 * {@link import("./validate.js").validateMeasured} first — this assumes a
 * NEUTRAL face and torso exist.
 */
export async function packCharacter(
  character: SourceCharacter,
  parts: MeasuredPart[],
  spec: AssetImageSpec,
): Promise<PackedCharacter> {
  const { placed, width, height } = shelfPack(parts);
  const canvas = createCanvas(width, Math.max(height, 1));
  const ctx = canvas.getContext("2d");
  const rects = new Map<string, Box>();
  for (const item of placed) {
    ctx.drawImage(
      toCanvas(item.measured.raster),
      item.box.x, item.box.y, item.box.width, item.box.height,
      item.rect.x, item.rect.y, item.rect.width, item.rect.height,
    );
    rects.set(item.measured.part.file, item.rect);
  }

  const joins: Partial<Record<PartKind, JoinPoint>> = {};
  for (const kind of ["face", "torso"] as const) {
    const join = resolveJoin(character, parts, kind, spec);
    if (join) joins[kind] = join;
  }

  const overlap = character.joinOverlap ?? spec.joinOverlap;
  const byKind = (kind: PartKind): PackedPart[] => {
    const join = joins[kind];
    if (!join) return [];
    return placed
      .filter((p) => p.measured.part.kind === kind)
      .sort((a, b) => character.parts.indexOf(a.measured.part) - character.parts.indexOf(b.measured.part))
      .map((p, i) => packedPart(p, i, join, kind === "torso" ? overlap : 0, spec));
  };

  const avatar: PackedAvatar = {
    name: character.name,
    type: character.type,
    torsoFirst: character.torsoFirst,
    sheet: "sheet.png",
    sheetWidth: width,
    sheetHeight: Math.max(height, 1),
    faces: byKind("face"),
    torsos: byKind("torso"),
    bodies: [],
  };

  return { id: character.id, avatar, sheet: await canvas.encode("png"), joins, rects };
}
