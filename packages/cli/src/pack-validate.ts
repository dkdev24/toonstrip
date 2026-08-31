/**
 * `toonstrip pack validate <dir>` — checks a pack against the contract in
 * TOONSTRIP_DEV_PLAN.md §6: `pack.json` shape, that every declared character's
 * sheet + manifest exist and every character has at least the minimum
 * required pose (NEUTRAL), and that every declared backdrop file exists with
 * dimensions matching what `pack.json` declares. Modeled on grues-in-comic's
 * `art/test/roster.test.ts` gate-2 inventory check.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPngDimensions } from "./png-dimensions.js";

const REQUIRED_EMOTIONS = ["NEUTRAL"];

interface PackedPart {
  kind: string;
  emotion: string;
}

interface PackedAvatar {
  faces?: PackedPart[];
  sheet: string;
}

interface PackedBackdropEntry {
  id: string;
  file: string;
  width: number;
  height: number;
}

interface PackJson {
  name?: string;
  version?: string;
  license?: string;
  characters?: { id: string; name: string; manifest: string; sheet: string }[];
  backdrops?: PackedBackdropEntry[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function fail(errors: string[], message: string): void {
  errors.push(message);
}

export function validatePack(dir: string): ValidationResult {
  const errors: string[] = [];
  const packJsonPath = join(dir, "pack.json");

  if (!existsSync(packJsonPath)) {
    return { ok: false, errors: [`${packJsonPath}: pack.json not found`] };
  }

  let pack: PackJson;
  try {
    pack = JSON.parse(readFileSync(packJsonPath, "utf8"));
  } catch (err) {
    return { ok: false, errors: [`${packJsonPath}: invalid JSON (${(err as Error).message})`] };
  }

  for (const field of ["name", "version", "license"] as const) {
    if (!pack[field]) fail(errors, `pack.json: missing required field "${field}"`);
  }
  if (!Array.isArray(pack.characters)) fail(errors, `pack.json: "characters" must be an array`);
  if (!Array.isArray(pack.backdrops)) fail(errors, `pack.json: "backdrops" must be an array`);

  const seenIds = new Set<string>();
  for (const entry of pack.characters ?? []) {
    if (seenIds.has(entry.id)) fail(errors, `character "${entry.id}" declared more than once`);
    seenIds.add(entry.id);

    const manifestPath = join(dir, entry.manifest);
    const sheetPath = join(dir, entry.sheet);
    if (!existsSync(manifestPath)) {
      fail(errors, `character "${entry.id}": manifest not found at ${entry.manifest}`);
      continue;
    }
    if (!existsSync(sheetPath)) {
      fail(errors, `character "${entry.id}": sheet not found at ${entry.sheet}`);
    }

    let avatar: PackedAvatar;
    try {
      avatar = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (err) {
      fail(errors, `character "${entry.id}": invalid manifest JSON (${(err as Error).message})`);
      continue;
    }

    const faces = avatar.faces ?? [];
    for (const required of REQUIRED_EMOTIONS) {
      if (!faces.some((f) => f.kind === "face" && f.emotion === required)) {
        fail(errors, `character "${entry.id}": missing required "${required}" face`);
      }
    }
  }

  for (const backdrop of pack.backdrops ?? []) {
    const filePath = join(dir, backdrop.file);
    if (!existsSync(filePath)) {
      fail(errors, `backdrop "${backdrop.id}": file not found at ${backdrop.file}`);
      continue;
    }
    try {
      const dims = readPngDimensions(filePath);
      if (dims.width !== backdrop.width || dims.height !== backdrop.height) {
        fail(
          errors,
          `backdrop "${backdrop.id}": pack.json declares ${backdrop.width}x${backdrop.height}, ` +
            `file is ${dims.width}x${dims.height}`,
        );
      }
    } catch (err) {
      fail(errors, `backdrop "${backdrop.id}": ${(err as Error).message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
