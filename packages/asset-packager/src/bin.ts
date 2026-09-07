#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { analyze } from "./analyze.js";
import { buildPack } from "./build.js";
import { renderAnchorGuide } from "./anchor-guide.js";
import { renderTemplate, type TemplateKind } from "./template.js";
import { promptChecklist, sourceJsonScaffold } from "./templates.js";
import type { Diagnostic } from "./validate.js";

function usage(): never {
  console.error(`Usage:
  toonstrip-pack init <source-dir> [--name <pack-name>]
  toonstrip-pack validate <source-dir>
  toonstrip-pack build <source-dir> --out <pack-dir> [--preview <joins.png>] [--force]
  toonstrip-pack template --out <ref.png> [--kind character|backdrop] [--ids a,b,c]
                          [--columns N] [--rows N] [--cell 512] [--label-band 0.1]
  toonstrip-pack anchor-guide <source-dir> <character-id> [--out <dir>]

A source dir holds source.json plus either individual PNGs
(characters/<id>/<kind>-<EMOTION>.png, backdrops/<id>.png) or sheets declared in
source.json, in any grid shape. See docs/asset-image-spec.md for the image rules
and docs/asset-sheets.md for sheet input.`);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function print(diagnostics: Diagnostic[], label: string): void {
  if (diagnostics.length === 0) return;
  console.error(`${label}:`);
  for (const d of diagnostics) {
    console.error(`  - ${d.file ? `${d.file}: ` : ""}${d.message}`);
  }
}

const argv = process.argv.slice(2);
const [command, target] = argv;

async function main(): Promise<number> {
  if (command === "init") {
    if (!target || target.startsWith("--")) usage();
    const packName = flag(argv, "name") ?? basename(target);
    const put = (relative: string, contents: string) => {
      const path = join(target, relative);
      if (existsSync(path)) {
        console.log(`  = ${relative} (already there, left alone)`);
        return;
      }
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, contents);
      console.log(`  + ${relative}`);
    };
    mkdirSync(join(target, "characters", "example"), { recursive: true });
    mkdirSync(join(target, "backdrops"), { recursive: true });
    console.log(`scaffolded ${target}`);
    put("source.json", sourceJsonScaffold(packName));
    put("POSES.md", promptChecklist());
    console.log(`\nNext: read POSES.md, then drop face-NEUTRAL.png and torso-NEUTRAL.png into`);
    console.log(`${target}/characters/<id>/`);
    return 0;
  }

  if (command === "template") {
    const out = flag(argv, "out");
    if (!out) usage();
    const ids = flag(argv, "ids");
    const number = (name: string) => (flag(argv, name) ? Number(flag(argv, name)) : undefined);
    const result = await renderTemplate({
      kind: (flag(argv, "kind") ?? "character") as TemplateKind,
      names: ids ? ids.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      columns: number("columns"),
      rows: number("rows"),
      cell: number("cell"),
      labelBand: number("label-band"),
    });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, result.png);
    console.log(`wrote ${out} (${result.grid.columns}x${result.grid.rows} cells)`);
    console.log(`\nPaste into source.json:\n`);
    console.log(JSON.stringify(result.declaration, null, 2));
    console.log(`\nPrompt the image model with the sheet above and:\n`);
    console.log(result.prompt);
    return 0;
  }

  if (command === "anchor-guide") {
    const characterId = argv[2];
    if (!target || target.startsWith("--") || !characterId) usage();
    const outDir = flag(argv, "out") ?? target;
    mkdirSync(outDir, { recursive: true });

    const { source } = await analyze(target);
    const character = source.characters.find((c) => c.id === characterId);
    if (!character) {
      console.error(`FAIL: no character "${characterId}" in ${target}`);
      return 1;
    }

    let wrote = 0;
    for (const kind of ["face", "torso"] as const) {
      try {
        const result = await renderAnchorGuide(character, kind);
        const outPath = join(outDir, `${characterId}-${kind}-anchor-guide.png`);
        writeFileSync(outPath, result.png);
        console.log(`wrote ${outPath} (${result.width}x${result.height}, from ${result.file})`);
        wrote++;
      } catch (err) {
        console.error(`  - ${(err as Error).message}`);
      }
    }
    if (wrote === 0) return 1;

    console.log(`\nShow the image(s) above to a vision model (or read the grid yourself) and ask`);
    console.log(`for the face's chin point / torso's collar-opening point, in the printed pixel`);
    console.log(`grid. A human should confirm or nudge whatever comes back — this is a proposal,`);
    console.log(`not ground truth. Paste the resulting x,y into source.json:\n`);
    console.log(
      JSON.stringify(
        { characters: [{ id: characterId, anchors: { face: { x: 0, y: 0 }, torso: { x: 0, y: 0 } } }] },
        null,
        2,
      ),
    );
    return 0;
  }

  if (command === "validate") {
    if (!target || target.startsWith("--")) usage();
    const { report, source } = await analyze(target);
    print(report.warnings, `${report.warnings.length} warning(s)`);
    if (report.ok) {
      const parts = source.characters.reduce((n, c) => n + c.parts.length, 0);
      console.log(
        `OK: ${target} is a buildable source pack ` +
          `(${source.characters.length} character(s), ${parts} pose(s), ${source.backdrops.length} backdrop(s))`,
      );
      return 0;
    }
    print(report.errors, `FAIL: ${report.errors.length} error(s)`);
    return 1;
  }

  if (command === "build") {
    const out = flag(argv, "out");
    if (!target || target.startsWith("--") || !out) usage();
    const result = await buildPack({
      source: target,
      out,
      force: argv.includes("--force"),
      preview: flag(argv, "preview"),
    });
    print(result.warnings, `${result.warnings.length} warning(s)`);
    if (result.files.length === 0) {
      print(result.errors, `FAIL: ${result.errors.length} error(s), nothing written`);
      return 1;
    }
    print(result.errors, `${result.errors.length} error(s) (built anyway: --force)`);
    console.log(`wrote ${result.files.length} file(s) to ${out}`);
    for (const character of result.characters) {
      const { avatar, joins } = character;
      console.log(
        `  ${character.id}: ${avatar.faces.length} face(s), ${avatar.torsos.length} torso(s), ` +
          `sheet ${avatar.sheetWidth}x${avatar.sheetHeight}, ` +
          `join from ${joins.face?.origin ?? "-"}/${joins.torso?.origin ?? "-"}`,
      );
    }
    console.log(`\nNext: toonstrip pack validate ${out}`);
    return 0;
  }

  usage();
}

main()
  .then((code) => process.exit(code))
  .catch((err: Error) => {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  });
