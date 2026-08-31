#!/usr/bin/env node
import { validatePack } from "./pack-validate.js";

function usage(): never {
  console.error("Usage: toonstrip pack validate <dir>");
  process.exit(1);
}

const [command, subcommand, arg] = process.argv.slice(2);

if (command === "pack" && subcommand === "validate") {
  if (!arg) usage();
  const result = validatePack(arg);
  if (result.ok) {
    console.log(`OK: ${arg} is a valid pack`);
    process.exit(0);
  }
  console.error(`FAIL: ${arg} is not a valid pack`);
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
} else {
  usage();
}
