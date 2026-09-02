/**
 * Build-time view of the registered packs' characters, for thumbnails that
 * show a sprite without rendering a canvas. Reads each pack's `pack.json` and
 * character manifests from the workspace (server-side only: uses node:fs) and
 * points at the URL the Astro integration copies the sheet to
 * (`/_toonstrip/<pack>/characters/<id>/sheet.png`).
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PackedAvatar, SheetRect } from "@toonstrip/core";

export interface RosterEntry {
  id: string;
  name: string;
  pack: string;
  sheetUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  /** The neutral face (or neutral torso when the pack has no separate faces). */
  thumb: SheetRect;
}

export interface BackdropEntry {
  id: string;
  pack: string;
  url: string;
  width: number;
  height: number;
}

interface PackJson {
  name: string;
  characters: { id: string; name?: string; manifest: string; sheet: string }[];
  backdrops: { id: string; file: string; width: number; height: number }[];
}

const require = createRequire(import.meta.url);

function readPack(specifier: string): { dir: string; pack: PackJson } {
  const dir = dirname(require.resolve(`${specifier}/package.json`));
  const pack = JSON.parse(readFileSync(join(dir, "pack.json"), "utf-8")) as PackJson;
  return { dir, pack };
}

function neutral(parts: PackedAvatar["faces"]): SheetRect | null {
  const pick = parts.find((p) => p.emotion === "NEUTRAL") ?? parts[0];
  return pick ? pick.figure : null;
}

export function loadRoster(specifiers: string[]): { characters: RosterEntry[]; backdrops: BackdropEntry[] } {
  const characters: RosterEntry[] = [];
  const backdrops: BackdropEntry[] = [];
  for (const specifier of specifiers) {
    const { dir, pack } = readPack(specifier);
    for (const c of pack.characters) {
      const manifest = JSON.parse(readFileSync(join(dir, c.manifest), "utf-8")) as PackedAvatar;
      const thumb = neutral(manifest.faces) ?? neutral(manifest.torsos) ?? neutral(manifest.bodies);
      if (!thumb) continue;
      characters.push({
        id: c.id,
        name: c.name ?? manifest.name,
        pack: pack.name,
        sheetUrl: `/_toonstrip/${pack.name}/characters/${c.id}/sheet.png`,
        sheetWidth: manifest.sheetWidth,
        sheetHeight: manifest.sheetHeight,
        thumb,
      });
    }
    for (const b of pack.backdrops) {
      backdrops.push({ id: b.id, pack: pack.name, url: `/_toonstrip/${pack.name}/${b.file}`, width: b.width, height: b.height });
    }
  }
  return { characters, backdrops };
}
