/**
 * `build`: source pack -> a directory that passes `toonstrip pack validate`.
 *
 * Output tree (dev plan §6):
 *
 *     out/
 *       pack.json
 *       characters/<id>/{<id>.json, sheet.png}
 *       backdrops/<id>.png
 *       NOTICE
 *       README.md
 *       package.json, tsconfig.json, src/{index,types}.ts   # --npm only
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { analyze, type Analysis } from "./analyze.js";
import { packCharacter, type PackedCharacter } from "./pack.js";
import { renderJoinPreview } from "./preview.js";
import { toCanvas } from "./image.js";
import {
  PACK_INDEX_TS,
  PACK_TSCONFIG,
  PACK_TYPES_TS,
  noticeFile,
  packagePackageJson,
  readmeFile,
} from "./templates.js";
import type { Diagnostic } from "./validate.js";

export interface BuildOptions {
  /** Source pack directory (the one holding `source.json`). */
  source: string;
  /** Output pack directory. Created if missing; existing files are overwritten. */
  out: string;
  /** Also write the installable npm package skeleton. */
  npm?: boolean;
  /** Write a join-preview PNG here. */
  preview?: string;
  /** Build even when validation reported errors. Off by default. */
  force?: boolean;
}

export interface BuildResult {
  ok: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  /** Files written, relative to `out`. */
  files: string[];
  characters: PackedCharacter[];
  analysis: Analysis;
}

function write(out: string, relative: string, data: string | Buffer, files: string[]): void {
  const path = join(out, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  files.push(relative);
}

export async function buildPack(options: BuildOptions): Promise<BuildResult> {
  const analysis = await analyze(options.source);
  const { report, source, measured } = analysis;
  if (!report.ok && !options.force) {
    return {
      ok: false,
      errors: report.errors,
      warnings: report.warnings,
      files: [],
      characters: [],
      analysis,
    };
  }

  const files: string[] = [];
  const packed: PackedCharacter[] = [];
  for (const character of source.characters) {
    const parts = measured.parts.get(character.id) ?? [];
    if (parts.length === 0) continue;
    const result = await packCharacter(character, parts, source.spec);
    packed.push(result);
    write(options.out, `characters/${character.id}/sheet.png`, result.sheet, files);
    write(
      options.out,
      `characters/${character.id}/${character.id}.json`,
      `${JSON.stringify(result.avatar, null, 2)}\n`,
      files,
    );
  }

  const backdrops: { id: string; file: string; width: number; height: number }[] = [];
  for (const item of measured.backdrops) {
    const relative = `backdrops/${item.backdrop.id}.png`;
    write(options.out, relative, await toCanvas(item.raster).encode("png"), files);
    backdrops.push({
      id: item.backdrop.id,
      file: relative,
      width: item.raster.width,
      height: item.raster.height,
    });
  }

  const packJson = {
    name: source.json.name,
    version: source.json.version,
    license: source.json.license,
    ...(source.json.description ? { description: source.json.description } : {}),
    characters: packed.map((p) => ({
      id: p.id,
      name: p.avatar.name,
      manifest: `characters/${p.id}/${p.id}.json`,
      sheet: `characters/${p.id}/sheet.png`,
    })),
    backdrops,
  };
  write(options.out, "pack.json", `${JSON.stringify(packJson, null, 2)}\n`, files);
  write(options.out, "NOTICE", noticeFile(source.json), files);
  write(
    options.out,
    "README.md",
    readmeFile(source.json, packed.map((p) => p.id), backdrops.map((b) => b.id)),
    files,
  );

  if (options.npm) {
    write(options.out, "package.json", packagePackageJson(source.json), files);
    write(options.out, "tsconfig.json", PACK_TSCONFIG, files);
    write(options.out, "src/types.ts", PACK_TYPES_TS, files);
    write(options.out, "src/index.ts", PACK_INDEX_TS, files);
  }

  if (options.preview && packed.length > 0) {
    const png = await renderJoinPreview(packed);
    mkdirSync(dirname(options.preview), { recursive: true });
    writeFileSync(options.preview, png);
  }

  return {
    ok: report.ok,
    errors: report.errors,
    warnings: report.warnings,
    files,
    characters: packed,
    analysis,
  };
}
