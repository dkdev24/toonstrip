/**
 * Sheet input: one image holding many assets, sliced into the same parts and
 * backdrops the per-pose path produces (dev plan §15).
 *
 * Two kinds, one slicer. A **backdrop sheet** is a grid of complete scenes,
 * named by `ids` in reading order. A **character sheet** is a grid of
 * face/torso cells named by a `layout`. Both declare their own shape — any
 * rows × columns — and cells no name reaches are unused.
 *
 * Nothing here trusts the model's pixel arithmetic. The declared grid is the
 * expectation; boundaries are pulled to the gutters actually present, cells
 * are keyed, cropped, squared and normalised to one size, and every way the
 * slice can have gone wrong (a cell bleeding into a gutter, a blank cell, two
 * identical scenes, a pose drawn at the wrong scale, a grid too dense to carry
 * `spec.cell`) comes back as a diagnostic naming the cell.
 */

import type { Raster } from "./image.js";
import {
  alphaProfiles, boundaries, cellBox, centreSquare, cropRaster, flatness, gridFor, inkAtEdge,
  keyBackground, padToSquare, resizeRaster, sameScene, scaleContent, sceneSignature,
  uniformityProfiles, type Grid, type SceneSignature,
} from "./grid.js";
import { register, NO_SHIFT } from "./register.js";
import { alphaBox, alphaStats, readPng } from "./image.js";
import { parsePartName, FILL_WINDOW, type AssetImageSpec, type PartKind } from "./spec.js";
import type { Diagnostic } from "./diagnostic.js";
import type {
  BackdropSheetDecl, CharacterSheetDecl, SheetDecl, SourceBackdrop, SourceCharacter, SourcePart,
} from "./source.js";

/** Below this drift, a pose is left alone — not worth resampling for. */
const SCALE_TOLERANCE = 0.12;
/** Above this drift, an auto-correction is still applied but gets a heads-up
 * diagnostic — the resampling needed is large enough that it's worth a
 * person glancing at the result once. */
const MAJOR_SCALE_DRIFT = 0.5;

/**
 * Enlarge `raster`'s content by up to `factor` about the bottom-centre of
 * `box`, without crossing an edge the gutter check cares about — top and
 * the sides always, bottom only for a face (a torso is allowed to run off
 * the bottom by design, the same rule the gutter check itself uses).
 *
 * A drawing with little headroom above it (a tall, narrow full-body pose)
 * may not have room to reach the fill target at all without clipping the
 * top — enlarging as far as geometry allows and stopping there beats both
 * clipping it and giving up on any enlargement at all. The starting point
 * is computed analytically (solving for the factor that lands each edge
 * exactly on the canvas boundary) rather than searched for by trial and
 * error, since geometric backoff from a large, unconstrained factor can
 * take more steps than it's worth trying to reach a small safe one; a
 * short empirical refinement afterwards catches resampling smoothing
 * bleeding a drawing a pixel or two past that exact prediction.
 */
function enlargeWithoutClipping(
  raster: Raster,
  factor: number,
  box: { x: number; y: number; width: number; height: number },
  kind: PartKind,
): Raster {
  if (factor <= 1) return raster;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height };
  const caps = [
    (2 * centre.x) / box.width, // left
    (2 * (raster.width - centre.x)) / box.width, // right
    centre.y / box.height, // top (checked for both kinds, like the gutter rule)
  ];
  let f = Math.min(factor, Math.min(...caps) * 0.92);
  for (let attempt = 0; attempt < 6 && f > 1.001; attempt++) {
    const candidate = scaleContent(raster, f, centre);
    if (!inkAtEdge(candidate, { top: true, left: true, right: true, bottom: kind === "face" })) {
      return candidate;
    }
    f = 1 + (f - 1) * 0.8;
  }
  return raster;
}

/** Cell boundaries on both axes, gutters found near where they were expected. */
function gridBoundaries(sheet: Raster, grid: Grid, decl: SheetDecl, transparent: boolean) {
  const profiles = transparent ? alphaProfiles(sheet) : uniformityProfiles(sheet);
  const window = decl.gutterWindow ?? 0.2;
  return {
    x: boundaries(sheet.width, grid.columns, profiles.columns, window),
    y: boundaries(sheet.height, grid.rows, profiles.rows, window),
  };
}

/** A sheet counts as transparent when a real alpha channel is in use. */
function isTransparent(sheet: Raster): boolean {
  return !alphaStats(sheet, null).fullyOpaque;
}

function keyingTolerance(decl: SheetDecl, fallback: boolean): number | null {
  const setting = decl.keyBackground ?? fallback;
  if (setting === false) return null;
  if (setting === true) return 28;
  return setting;
}

/**
 * Drops the printed label, then trims the cell's own inset. The inset exists
 * because a slice boundary lands in the *middle* of a painted gutter stroke,
 * so half the stroke would otherwise stay inside the cell and read as art.
 */
function trimCell(cell: Raster, decl: SheetDecl): Raster {
  const band = Math.round((decl.labelBand ?? 0) * cell.height);
  const banded =
    band > 0
      ? cropRaster(cell, { x: 0, y: band, width: cell.width, height: cell.height - band })
      : cell;
  const inset = Math.round((decl.inset ?? 0.02) * Math.min(banded.width, banded.height));
  if (inset <= 0) return banded;
  return cropRaster(banded, {
    x: inset,
    y: inset,
    width: banded.width - inset * 2,
    height: banded.height - inset * 2,
  });
}

export interface SlicedBackdrops {
  backdrops: SourceBackdrop[];
  diagnostics: Diagnostic[];
}

export async function sliceBackdropSheet(
  decl: BackdropSheetDecl & { path: string },
  spec: AssetImageSpec,
): Promise<SlicedBackdrops> {
  const diagnostics: Diagnostic[] = [];
  const sheet = await readPng(decl.path);
  const ids = decl.ids ?? [];
  if (ids.length === 0) {
    return {
      backdrops: [],
      diagnostics: [{ level: "error", file: decl.file, message: `backdrop sheet declares no "ids"` }],
    };
  }

  const grid = gridFor(ids.length, decl.columns, decl.rows);
  if (grid.columns * grid.rows < ids.length) {
    diagnostics.push({
      level: "error",
      file: decl.file,
      message:
        `grid is ${grid.columns}x${grid.rows} = ${grid.columns * grid.rows} cells but ${ids.length} ` +
        `ids are declared — raise "columns"/"rows" or drop ids`,
    });
    return { backdrops: [], diagnostics };
  }

  const { x, y } = gridBoundaries(sheet, grid, decl, isTransparent(sheet));
  const cellEdge = Math.min(
    Math.round(sheet.width / grid.columns),
    Math.round(sheet.height / grid.rows),
  );
  if (cellEdge < spec.backdropSize) {
    diagnostics.push({
      level: cellEdge * 2 < spec.backdropSize ? "error" : "warning",
      file: decl.file,
      message:
        `a ${grid.columns}x${grid.rows} grid of this ${sheet.width}x${sheet.height} sheet gives ` +
        `~${cellEdge}px cells, below the pack's ${spec.backdropSize}px backdrop size — ` +
        `generate the sheet larger, or use fewer cells per sheet`,
    });
  }

  const backdrops: SourceBackdrop[] = [];
  const signatures: { id: string; signature: SceneSignature }[] = [];
  ids.forEach((id, index) => {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const cellLabel = `${decl.file}[${column},${row}] -> ${id}`;
    const box = cellBox(x, y, column, row);

    let cell = trimCell(cropRaster(sheet, box), decl);
    if (flatness(cell) > 0.97) {
      diagnostics.push({
        level: "error",
        file: cellLabel,
        message: `cell is blank — the sheet has fewer scenes than the grid declares`,
      });
      return;
    }

    const tolerance = keyingTolerance(decl, false);
    if (tolerance !== null) keyBackground(cell, tolerance);
    cell = resizeRaster(cropRaster(cell, centreSquare(cell)), spec.backdropSize);

    signatures.push({ id, signature: sceneSignature(cell) });
    backdrops.push({
      id,
      file: `backdrops/${id}.png`,
      path: decl.path,
      image: cell,
      origin: `${decl.file}[${column},${row}]`,
    });
  });

  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const verdict = sameScene(signatures[i]!.signature, signatures[j]!.signature);
      if (verdict.same) {
        diagnostics.push({
          level: "warning",
          file: decl.file,
          message:
            `"${signatures[i]!.id}" and "${signatures[j]!.id}" are near-identical scenes ` +
            `(structure distance ${verdict.distance}) — the model repeated a cell`,
        });
      }
    }
  }

  return { backdrops, diagnostics };
}

export interface SlicedParts {
  parts: SourcePart[];
  diagnostics: Diagnostic[];
}

export async function sliceCharacterSheet(
  character: SourceCharacter,
  decl: CharacterSheetDecl & { path: string },
  spec: AssetImageSpec,
): Promise<SlicedParts> {
  const diagnostics: Diagnostic[] = [];
  const layout = decl.layout ?? [];
  if (layout.length === 0) {
    return {
      parts: [],
      diagnostics: [
        { level: "error", file: decl.file, message: `character sheet declares no "layout"` },
      ],
    };
  }

  const sheet = await readPng(decl.path);
  const grid: Grid = {
    rows: layout.length,
    columns: Math.max(...layout.map((row) => row.length)),
  };
  const { x, y } = gridBoundaries(sheet, grid, decl, isTransparent(sheet));

  const nominalEdge = Math.min(
    Math.round(sheet.width / grid.columns),
    Math.round(sheet.height / grid.rows),
  );
  if (nominalEdge < spec.cell) {
    diagnostics.push({
      level: nominalEdge * 2 < spec.cell ? "error" : "warning",
      file: decl.file,
      message:
        `a ${grid.columns}x${grid.rows} grid of this ${sheet.width}x${sheet.height} sheet gives ` +
        `~${nominalEdge}px cells, below the pack's ${spec.cell}px cell size — ` +
        `generate the sheet larger, or split it into more sheets`,
    });
  }

  // Slice first, then normalise every cell to one square size: registration
  // compares cells pixel for pixel, and the boundaries found in the sheet are
  // never quite even.
  interface Cell {
    part: SourcePart;
    raster: Raster;
    label: string;
  }
  const cells: Cell[] = [];
  const tolerance = keyingTolerance(decl, true);

  layout.forEach((row, rowIndex) => {
    row.forEach((name, columnIndex) => {
      if (!name) return;
      const cellLabel = `${decl.file}[${columnIndex},${rowIndex}] -> ${name}`;
      const parsed = parsePartName(`${name}.png`);
      if (!parsed) {
        diagnostics.push({
          level: "error",
          file: cellLabel,
          message:
            `cell name "${name}" is not <kind>-<EMOTION>[@intensity][-variant] — ` +
            `a layout cell is a part filename without the .png`,
        });
        return;
      }

      let cell = trimCell(cropRaster(sheet, cellBox(x, y, columnIndex, rowIndex)), decl);
      if (tolerance !== null) keyBackground(cell, tolerance);
      // The gutter check happens later, on the cell *after* scale
      // normalization — a raw slice that runs into the gutter because the
      // drawing was oversized is exactly what that correction fixes, so
      // checking here would flag a problem that's about to be resolved.
      cell = padToSquare(cell, parsed.kind !== "face");
      cells.push({
        raster: cell,
        label: cellLabel,
        part: {
          ...parsed,
          file: `${name}.png`,
          path: decl.path,
          origin: `${decl.file}[${columnIndex},${rowIndex}]`,
          align: NO_SHIFT,
        },
      });
    });
  });

  const edge = Math.max(1, ...cells.map((c) => c.raster.width));
  for (const cell of cells) {
    cell.raster = resizeRaster(cell.raster, edge);
    cell.part.image = cell.raster;
  }

  // Normalize each kind's NEUTRAL cell toward the middle of the pack's fill
  // window first — this is the one cell everything else measures against,
  // so a character drawn too small, too large, or just balanced on the
  // window's edge would otherwise carry that into every other pose
  // registered below (a sibling pose a little bigger than NEUTRAL tips
  // outside the window on its own), and into how this character sits next
  // to the pack's other characters. Pulled toward the middle rather than
  // only corrected when clearly out of bounds, so there is real headroom
  // for the normal pose-to-pose variance an image model produces.
  for (const kind of ["face", "torso"] as const) {
    const reference = cells.find((c) => c.part.kind === kind && c.part.emotion === "NEUTRAL");
    if (!reference) continue;
    const box = alphaBox(reference.raster);
    if (!box || box.width <= 0) continue;
    const window = FILL_WINDOW[kind];
    const target = (window.min + window.max) / 2;
    const factor = (reference.raster.width * target) / box.width;
    if (Math.abs(factor - 1) > 0.03) {
      // Anchor on the bottom-centre of the drawing, not its true centre: the
      // join for both kinds lives at the bottom (a face's neck-stub base, a
      // torso's feet cut off by the canvas edge), and scaling about that
      // point is what keeps it pinned there instead of drifting away from
      // the edge a torso is required to touch. Enlarging (factor > 1) backs
      // off if it would clip; shrinking never clips, so it always applies.
      reference.raster =
        factor > 1
          ? enlargeWithoutClipping(reference.raster, factor, box, kind)
          : scaleContent(reference.raster, factor, { x: box.x + box.width / 2, y: box.y + box.height });
      reference.part.image = reference.raster;
    }
  }

  // Register every other cell against its (now correctly sized) NEUTRAL
  // cell: one pass, one scale, so a pose drawn a few pixels high or at a
  // different zoom gets corrected rather than inheriting a wrong join or
  // composing at a visibly different size later. This is what a folder of
  // separate files cannot do.
  for (const kind of ["face", "torso"] as const) {
    const ofKind = cells.filter((c) => c.part.kind === kind);
    const reference = ofKind.find((c) => c.part.emotion === "NEUTRAL");
    if (!reference) continue;
    const referenceBox = alphaBox(reference.raster);
    for (const cell of ofKind) {
      if (cell === reference) continue;
      const box = alphaBox(cell.raster);
      if (box && referenceBox && box.width > 0) {
        const drift = Math.abs(box.width / referenceBox.width - 1);
        if (drift > SCALE_TOLERANCE) {
          const factor = referenceBox.width / box.width;
          // Same bottom-centre anchor as the NEUTRAL normalization above —
          // keeps the join edge (neck-stub base / feet) pinned in place.
          // Enlarging backs off if it would clip; shrinking never clips.
          cell.raster =
            factor > 1
              ? enlargeWithoutClipping(cell.raster, factor, box, cell.part.kind)
              : scaleContent(cell.raster, factor, { x: box.x + box.width / 2, y: box.y + box.height });
          cell.part.image = cell.raster;
          if (drift > MAJOR_SCALE_DRIFT) {
            diagnostics.push({
              level: "warning",
              file: `${decl.file} -> ${cell.part.file}`,
              message:
                `auto-corrected a large ${Math.round(drift * 100)}% scale mismatch against NEUTRAL — ` +
                `the model changed scale a lot mid-sheet; worth a glance that the resampled result still looks right`,
            });
          }
        }
      }
      cell.part.align = register(cell.raster, reference.raster);
    }
  }

  // Now that every cell is at its corrected scale, check for a slice that
  // still runs into the gutter — a torso is meant to run off the bottom of
  // its canvas, so only the other three edges count as evidence of a bad cut.
  for (const cell of cells) {
    if (inkAtEdge(cell.raster, { top: true, left: true, right: true, bottom: cell.part.kind === "face" })) {
      diagnostics.push({
        level: "warning",
        file: cell.label,
        message: `drawing runs into the gutter — the slice may have cut through it`,
      });
    }
  }

  return { parts: cells.map((c) => c.part), diagnostics };
}
