/**
 * Validating a source pack against the asset image spec.
 *
 * The split matters: an **error** means the pack cannot be built (the file is
 * unreadable, the wrong shape, or the inventory the renderer requires is
 * missing), a **warning** means it will build and render but probably look
 * wrong (a floating body, a soft-edged upscale, a head twice the size of the
 * pack's others). A model-generated batch typically produces zero errors and
 * a handful of warnings, which is exactly the list a reviewer needs.
 */

import { FILL_WINDOW, isKnownEmotion, EMOTION_LIST, type PartKind } from "./spec.js";
import { touches } from "./image.js";
import { MAX_FRINGE_RATIO } from "./spec.js";
import type { Diagnostic } from "./diagnostic.js";
import type { MeasuredBackdrop, MeasuredPart } from "./measure.js";
import type { SourceCharacter, SourcePack } from "./source.js";

export type { Level, Diagnostic } from "./diagnostic.js";

export interface ValidationReport {
  ok: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

export interface MeasuredPack {
  source: SourcePack;
  parts: Map<string, MeasuredPart[]>;
  backdrops: MeasuredBackdrop[];
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function validatePart(measured: MeasuredPart, spec: SourcePack["spec"], out: Diagnostic[]): void {
  const { part, native, box, stats } = measured;
  const file = part.origin ? `${part.file} (${part.origin})` : part.file;
  const kind: PartKind = part.kind;

  if (!isKnownEmotion(part.emotion)) {
    out.push({
      level: "error",
      file,
      message: `unknown emotion "${part.emotion}" — must be one of: ${EMOTION_LIST.join(", ")}`,
    });
  }
  if (!(part.intensity >= 0 && part.intensity <= 1)) {
    out.push({ level: "error", file, message: `intensity ${part.intensity} is outside 0.0-1.0` });
  }
  // A sheet cell is square and sized by construction, and the slicer already
  // reported it if the declared grid could not carry `spec.cell` — so these
  // two checks belong to the per-pose path only.
  if (!part.origin) {
    if (native.width !== native.height) {
      out.push({
        level: "error",
        file,
        message: `part canvases must be square, this one is ${native.width}x${native.height}`,
      });
    }
    if (Math.min(native.width, native.height) < spec.minInput) {
      out.push({
        level: "error",
        file,
        message: `${native.width}x${native.height} is below the minimum input edge of ${spec.minInput}px`,
      });
    }
  }
  if (!box) {
    out.push({ level: "error", file, message: `no drawing found — every pixel is transparent` });
    return;
  }
  if (stats.fullyOpaque || stats.cornerAlpha >= 250) {
    out.push({
      level: "error",
      file,
      message:
        `background is not transparent (corner alpha ${stats.cornerAlpha}) — ` +
        `export RGBA with the background erased, not a white or coloured fill`,
    });
  }

  const fill = box.width / measured.raster.width;
  const window = FILL_WINDOW[kind];
  if (fill < window.min || fill > window.max) {
    out.push({
      level: "warning",
      file,
      message:
        `drawing fills ${pct(fill)} of the canvas width, outside the ${pct(window.min)}-${pct(window.max)} ` +
        `window for a ${kind} — figures in this pack will be out of proportion with each other`,
    });
  }
  if (stats.fringe > MAX_FRINGE_RATIO) {
    out.push({
      level: "warning",
      file,
      message:
        `${pct(stats.fringe)} of the drawing is semi-transparent — soft or blurred edges. ` +
        `The renderer draws hard-edged line art; flatten the alpha`,
    });
  }
  if (measured.markerPixels > measured.raster.width * measured.raster.height * 0.01) {
    out.push({
      level: "warning",
      file,
      message: `join marker covers ${measured.markerPixels} px — a marker should be a dot, not a region`,
    });
  }

  const edge = touches(box, measured.raster);
  if (edge.left || edge.right) {
    out.push({ level: "warning", file, message: `drawing is clipped at the canvas side edge` });
  }
  if (kind === "face" && edge.top) {
    out.push({ level: "warning", file, message: `head is clipped at the top of the canvas` });
  }
  if (kind === "torso" && !edge.bottom) {
    const gap = measured.raster.height - (box.y + box.height);
    out.push({
      level: "warning",
      file,
      message:
        `torso stops ${gap}px above the bottom of the canvas — a torso should be cut off by the ` +
        `bottom edge, not float above it`,
    });
  }
}

function validateCharacter(
  character: SourceCharacter,
  parts: MeasuredPart[],
  spec: SourcePack["spec"],
  out: Diagnostic[],
): void {
  const label = `character "${character.id}"`;
  for (const file of character.unknown) {
    out.push({
      level: "warning",
      file: `${character.id}/${file}`,
      message: `${label}: filename does not match <kind>-<EMOTION>[@intensity][-variant].png, so it was ignored`,
    });
  }
  if (parts.length === 0) {
    out.push({ level: "error", message: `${label}: no pose PNGs found in ${character.dir}` });
    return;
  }

  const of = (kind: PartKind) => parts.filter((m) => m.part.kind === kind);
  const has = (kind: PartKind, emotion: string) =>
    of(kind).some((m) => m.part.emotion === emotion);

  for (const kind of ["face", "torso"] as const) {
    if (of(kind).length === 0) {
      out.push({ level: "error", message: `${label}: no ${kind} poses — a character needs both a face and a torso` });
    } else if (!has(kind, "NEUTRAL")) {
      out.push({
        level: "error",
        message: `${label}: missing ${kind}-NEUTRAL.png — NEUTRAL is the fallback every other pose falls back to`,
      });
    }
  }
  if (of("face").length === 1) {
    out.push({
      level: "warning",
      message: `${label}: only one face pose, so every line of dialogue renders the same expression`,
    });
  }
  if (of("body").length > 0) {
    out.push({
      level: "warning",
      message:
        `${label}: body-*.png files are packed but not composited — the renderer draws face+torso ` +
        `(COMPLEX) figures only`,
    });
  }

  for (const [kind, anchor] of Object.entries(character.anchors ?? {})) {
    if (!anchor) continue;
    const sample = of(kind as PartKind)[0];
    const edge = sample?.native.width ?? spec.cell;
    if (anchor.x < 0 || anchor.y < 0 || anchor.x > edge || anchor.y > edge) {
      out.push({
        level: "error",
        message:
          `${label}: anchors.${kind} (${anchor.x}, ${anchor.y}) is outside the ${edge}x${edge} ` +
          `input canvas — anchors are in input-canvas pixels`,
      });
    }
  }

  for (const measured of parts) {
    const scoped: Diagnostic[] = [];
    validatePart(measured, spec, scoped);
    for (const d of scoped) out.push({ ...d, file: `${character.id}/${d.file}` });
  }
}

function validateBackdrop(measured: MeasuredBackdrop, out: Diagnostic[]): void {
  const { backdrop, native, stats } = measured;
  const file = backdrop.origin ? `${backdrop.file} (${backdrop.origin})` : backdrop.file;
  if (native.width !== native.height) {
    out.push({
      level: "warning",
      file,
      message:
        `backdrop is ${native.width}x${native.height} — backdrops are drawn square-cover, so a ` +
        `non-square image will be cropped`,
    });
  }
  if (Math.min(native.width, native.height) < 400) {
    out.push({
      level: "warning",
      file,
      message: `backdrop is ${native.width}x${native.height}; a panel renders at 400px wide, so this will look soft`,
    });
  }
  if (!stats.fullyOpaque) {
    out.push({
      level: "warning",
      file,
      message: `backdrop has transparent pixels — a backdrop should be a fully painted square`,
    });
  }
}

export function validateMeasured(measured: MeasuredPack): ValidationReport {
  const diagnostics: Diagnostic[] = [];
  const { source } = measured;

  for (const field of ["name", "version", "license"] as const) {
    if (!source.json[field]) {
      diagnostics.push({ level: "error", file: "source.json", message: `missing required field "${field}"` });
    }
  }
  if (source.characters.length === 0) {
    diagnostics.push({ level: "error", message: `no characters found under ${source.dir}/characters` });
  }
  if (source.backdrops.length === 0) {
    diagnostics.push({
      level: "warning",
      message: `no backdrops found — a document must name a backdrop the pack declares, so pair this pack with one that has them`,
    });
  }

  for (const character of source.characters) {
    validateCharacter(character, measured.parts.get(character.id) ?? [], source.spec, diagnostics);
  }
  for (const backdrop of measured.backdrops) validateBackdrop(backdrop, diagnostics);

  const errors = diagnostics.filter((d) => d.level === "error");
  const warnings = diagnostics.filter((d) => d.level === "warning");
  return { ok: errors.length === 0, errors, warnings };
}
