import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { CastManifest, PackJson, PackedAvatar } from "./types.js";

export type { CastManifest, PackedAvatar, PackedBackdrop, PackedPart, SheetRect, PackJson } from "./types.js";

const PACK_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** This pack's `pack.json`, unmodified. */
export function loadPackJson(): PackJson {
  return readJson<PackJson>(join(PACK_ROOT, "pack.json"));
}

/**
 * Assembles a `CastManifest` (the shape `packages/core` consumes) from
 * `pack.json` plus each character's per-character manifest. `sheet` paths are
 * rewritten to absolute paths so a caller can load them from any cwd.
 */
export function loadCastManifest(): CastManifest {
  const pack = loadPackJson();
  const cast: Record<string, PackedAvatar> = {};
  for (const entry of pack.characters) {
    const avatar = readJson<PackedAvatar>(join(PACK_ROOT, entry.manifest));
    cast[entry.id] = { ...avatar, sheet: join(PACK_ROOT, entry.sheet) };
  }
  const backdrops = pack.backdrops.map((b) => ({ ...b, file: join(PACK_ROOT, b.file) }));
  return { version: 1, cast, backdrops };
}
