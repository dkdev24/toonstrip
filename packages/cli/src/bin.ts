#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { validatePack } from "./pack-validate.js";
import { renderDocument } from "./render.js";

function usage(): never {
  console.error(`Usage:
  toonstrip pack validate <dir>
  toonstrip render <doc.json> --out <strip.png> [--width 1200] [--scale 2]
                   [--pack <dir>]... [--font <file.ttf>]... [--transparent] [--background #ffffff]`);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function flags(args: string[], name: string): string[] {
  const out: string[] = [];
  args.forEach((a, i) => a === `--${name}` && args[i + 1] && out.push(args[i + 1]));
  return out;
}

const argv = process.argv.slice(2);
const [command, subcommand, arg] = argv;

if (command === "pack" && subcommand === "validate") {
  if (!arg) usage();
  validatePack(arg).then((result) => {
    if (result.ok) {
      console.log(`OK: ${arg} is a valid pack`);
      process.exit(0);
    }
    console.error(`FAIL: ${arg} is not a valid pack`);
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  });
} else if (command === "render") {
  const input = subcommand;
  const out = flag(argv, "out");
  if (!input || !out || input.startsWith("--")) usage();
  const doc = JSON.parse(readFileSync(input, "utf-8"));
  renderDocument(doc, {
    width: flag(argv, "width") ? Number(flag(argv, "width")) : undefined,
    scale: flag(argv, "scale") ? Number(flag(argv, "scale")) : undefined,
    packs: flags(argv, "pack"),
    fonts: flags(argv, "font"),
    transparent: argv.includes("--transparent"),
    background: flag(argv, "background"),
  })
    .then((result) => {
      writeFileSync(out, result.png);
      console.log(`wrote ${out} (${result.width}×${result.height}, ${result.columns} column${result.columns === 1 ? "" : "s"})`);
    })
    .catch((err: Error) => {
      console.error(`FAIL: ${err.message}`);
      process.exit(1);
    });
} else {
  usage();
}
