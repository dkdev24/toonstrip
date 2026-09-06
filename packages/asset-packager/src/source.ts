/**
 * Reading a *source pack*: `source.json` plus a directory of per-pose PNGs.
 * This is the authoring-side format — the thing a human or an image model
 * produces. `pack.json` and the rect tables are outputs, never inputs.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { comparePartOrder, DEFAULT_SPEC, parsePartName, type AssetImageSpec, type PartKind } from "./spec.js";
import type { Raster } from "./image.js";
import type { Registration } from "./register.js";

/** An explicit join point, in *input canvas* pixel coordinates. */
export interface AnchorPoint {
  x: number;
  y: number;
}

/**
 * Common to both sheet kinds (dev plan §15). The grid is declared, any shape:
 * a backdrop sheet from its `ids` (plus an optional column count), a character
 * sheet from its `layout`. Cells no name reaches are unused.
 */
export interface SheetDecl {
  /** Source-relative path to the sheet image. */
  file: string;
  columns?: number;
  rows?: number;
  /**
   * Fraction of each cell's height taken by a printed label, cropped off the
   * top of the cell before anything else looks at it.
   */
  labelBand?: number;
  /**
   * Erase a flat background by flood-filling in from each cell's edges.
   * `true` uses the default tolerance; a number sets it. Defaults to `true`
   * for character sheets, since few image models emit real transparency.
   */
  keyBackground?: boolean | number;
  /** How far from its nominal position a gutter may be found, as a fraction. */
  gutterWindow?: number;
  /**
   * Fraction of each cell trimmed off all four sides after slicing, to drop
   * the half of a painted gutter stroke that lands inside the cell. Defaults
   * to 2%, which covers a hand-drawn or model-drawn frame line.
   */
  inset?: number;
}

export interface BackdropSheetDecl extends SheetDecl {
  /** Backdrop ids in reading order, row-major. */
  ids: string[];
}

export interface CharacterSheetDecl extends SheetDecl {
  /**
   * Rows of cell names — a part filename without `.png`, e.g. `face-NEUTRAL`
   * — or `null` for a cell to skip.
   */
  layout: (string | null)[][];
}

export interface SourceCharacterDecl {
  id: string;
  name?: string;
  /** "COMPLEX" (face + torso, the only kind the renderer composites) . */
  type?: string;
  /** Draw the torso over the face's collar instead of under it. */
  torsoFirst?: boolean;
  /** Explicit join points; wins over a marker pixel and over the convention. */
  anchors?: { face?: AnchorPoint; torso?: AnchorPoint };
  /** Per-character override of the spec's head-into-collar overlap. */
  joinOverlap?: number;
  /** Per-character override of the spec's `faceScale`. */
  faceScale?: number;
  /** One image holding this character's poses as a grid of cells. */
  sheet?: CharacterSheetDecl;
}

export interface SourceBackdropDecl {
  id: string;
  /** Defaults to `backdrops/<id>.png`. */
  file?: string;
}

export interface SourceJson {
  name: string;
  version: string;
  license: string;
  description?: string;
  /** Free text copied into the output `NOTICE` — credit the artist here. */
  attribution?: string;
  spec?: Partial<AssetImageSpec>;
  characters?: SourceCharacterDecl[];
  backdrops?: SourceBackdropDecl[];
  /** Sheets of whole scenes, any grid shape, several allowed. */
  backdropSheets?: BackdropSheetDecl[];
}

export interface SourcePart {
  kind: PartKind;
  emotion: string;
  intensity: number;
  variant: number;
  /** Filename (real, or the cell name a sheet gave it), for diagnostics. */
  file: string;
  path: string;
  /** Set when the part was sliced out of a sheet rather than read from disk. */
  image?: Raster;
  /** Where a sliced part came from, e.g. `sheet.png[2,1]`. */
  origin?: string;
  /** Shift against this character's NEUTRAL cell. Sheet parts only. */
  align?: Registration;
}

export interface SourceCharacter extends SourceCharacterDecl {
  name: string;
  type: string;
  torsoFirst: boolean;
  dir: string;
  parts: SourcePart[];
  /** Files in the character directory that the spec does not recognise. */
  unknown: string[];
}

export interface SourceBackdrop {
  id: string;
  file: string;
  path: string;
  /** Set when the backdrop was sliced out of a sheet. */
  image?: Raster;
  origin?: string;
}

export interface SourcePack {
  dir: string;
  json: SourceJson;
  spec: AssetImageSpec;
  characters: SourceCharacter[];
  backdrops: SourceBackdrop[];
  /** Declared backdrop sheets, with absolute paths resolved. */
  backdropSheets: (BackdropSheetDecl & { path: string })[];
}

function directories(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function pngs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort();
}

/**
 * Loads a source pack. Character and backdrop lists in `source.json` are
 * optional: anything omitted is discovered from the directory tree, so the
 * common case is a `source.json` carrying only pack metadata.
 */
export function readSource(dir: string): SourcePack {
  const sourceJsonPath = join(dir, "source.json");
  if (!existsSync(sourceJsonPath)) {
    throw new Error(`${sourceJsonPath}: source.json not found (run \`toonstrip-pack init\` to scaffold one)`);
  }
  const json = JSON.parse(readFileSync(sourceJsonPath, "utf8")) as SourceJson;
  const spec: AssetImageSpec = { ...DEFAULT_SPEC, ...(json.spec ?? {}) };

  const charactersDir = join(dir, "characters");
  const declared = new Map((json.characters ?? []).map((c) => [c.id, c]));
  const ids = json.characters ? json.characters.map((c) => c.id) : directories(charactersDir);

  // A sheet image lives in the tree like any other PNG, so it must not also
  // be scanned as a pose or discovered as a backdrop of its own.
  const sheetFiles = new Set<string>([
    ...(json.backdropSheets ?? []).map((s) => s.file),
    ...(json.characters ?? []).flatMap((c) => (c.sheet ? [c.sheet.file] : [])),
  ]);

  const characters: SourceCharacter[] = ids.map((id) => {
    const decl = declared.get(id) ?? { id };
    const charDir = join(charactersDir, id);
    const files = pngs(charDir).filter((f) => !sheetFiles.has(`characters/${id}/${f}`));
    const parts: SourcePart[] = [];
    const unknown: string[] = [];
    for (const file of files) {
      const parsed = parsePartName(file);
      if (!parsed) {
        unknown.push(file);
        continue;
      }
      parts.push({ ...parsed, file, path: join(charDir, file) });
    }
    parts.sort(comparePartOrder);
    return {
      ...decl,
      id,
      name: decl.name ?? id.charAt(0).toUpperCase() + id.slice(1),
      type: decl.type ?? "COMPLEX",
      torsoFirst: decl.torsoFirst ?? false,
      dir: charDir,
      parts,
      unknown,
    };
  });

  const backdropsDir = join(dir, "backdrops");
  const backdropDecls: SourceBackdropDecl[] =
    json.backdrops ??
    pngs(backdropsDir)
      .filter((f) => !sheetFiles.has(`backdrops/${f}`))
      .map((f) => ({ id: f.replace(/\.png$/i, "") }));
  const backdrops: SourceBackdrop[] = backdropDecls.map((b) => {
    const file = b.file ?? `backdrops/${b.id}.png`;
    return { id: b.id, file, path: join(dir, file) };
  });

  const backdropSheets = (json.backdropSheets ?? []).map((sheet) => ({
    ...sheet,
    path: join(dir, sheet.file),
  }));

  return { dir, json, spec, characters, backdrops, backdropSheets };
}
