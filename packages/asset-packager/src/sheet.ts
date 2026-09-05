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
  keyBackground, padToSquare, resizeRaster, sameScene, sceneSignature, uniformityProfiles,
  type Grid, type SceneSignature,
} from "./grid.js";
import { register, NO_SHIFT } from "./register.js";
import { alphaBox, alphaStats, readPng } from "./image.js";
import { parsePartName, type AssetImageSpec } from "./spec.js";
import type { Diagnostic } from "./diagnostic.js";
import type {
  BackdropSheetDecl, CharacterSheetDecl, SheetDecl, SourceBackdrop, SourceCharacter, SourcePart,
} from "./source.js";

/** How much a pose may differ in size from NEUTRAL before it reads as drift. */
const SCALE_TOLERANCE = 0.12;

/** Cell boundaries on both axes, gutters found near where they were expected. */
function gridBoundaries(sheet: Raster, grid: Grid, decl: SheetDecl, transparent: boolean) {
  const profiles = transparent ? alphaProfiles(sheet) : uniformityProfiles(sheet);
  const window = decl.gutterWindow ?? 0.2;
  return {
    profiles,
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
      // A torso is meant to run off the bottom of its canvas, so only the
      // other three edges are evidence that the slice cut through a drawing.
      if (inkAtEdge(cell, { top: true, left: true, right: true, bottom: parsed.kind === "face" })) {
        diagnostics.push({
          level: "warning",
          file: cellLabel,
          message: `drawing runs into the gutter — the slice may have cut through it`,
        });
      }
      cell = padToSquare(cell, parsed.kind !== "face");
      cells.push({
        raster: cell,
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

  // Register every cell against its kind's NEUTRAL cell: one pass, one scale,
  // so a pose drawn a few pixels high gets corrected rather than inheriting a
  // wrong join. This is what a folder of separate files cannot do.
  for (const kind of ["face", "torso"] as const) {
    const ofKind = cells.filter((c) => c.part.kind === kind);
    const reference = ofKind.find((c) => c.part.emotion === "NEUTRAL");
    if (!reference) continue;
    const referenceBox = alphaBox(reference.raster);
    for (const cell of ofKind) {
      if (cell === reference) continue;
      cell.part.align = register(cell.raster, reference.raster);
      const box = alphaBox(cell.raster);
      if (!box || !referenceBox) continue;
      const drift = Math.abs(box.width / referenceBox.width - 1);
      if (drift > SCALE_TOLERANCE) {
        diagnostics.push({
          level: "warning",
          file: `${decl.file} -> ${cell.part.file}`,
          message:
            `drawn ${Math.round(drift * 100)}% wider/narrower than the NEUTRAL cell — the model ` +
            `changed scale mid-sheet, so this pose will not composite at the same size`,
        });
      }
    }
  }

  return { parts: cells.map((c) => c.part), diagnostics };
}
