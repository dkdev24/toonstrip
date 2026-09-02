// Validates every src/content/strips/*.json with @toonstrip/schema and checks
// that each character/backdrop id exists in the packs the site serves.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { validateDocument } from "@toonstrip/schema";

const require = createRequire(import.meta.url);
const ids = { characters: new Set(), backdrops: new Set() };
for (const spec of ["@toonstrip/pack-comic-chat", "@toonstrip/pack-example"]) {
  const pack = JSON.parse(readFileSync(join(dirname(require.resolve(`${spec}/package.json`)), "pack.json"), "utf-8"));
  pack.characters.forEach((c) => ids.characters.add(c.id));
  pack.backdrops.forEach((b) => ids.backdrops.add(b.id));
}
const dir = new URL("../src/content/strips/", import.meta.url);
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  try {
    const doc = validateDocument(JSON.parse(readFileSync(new URL(file, dir), "utf-8")));
    const problems = [];
    doc.panels.forEach((p, i) => {
      if (!ids.backdrops.has(p.backdrop)) problems.push(`panel ${i}: unknown backdrop ${p.backdrop}`);
      const onStage = new Set(p.bodies.map((b) => b.character));
      p.bodies.forEach((b) => !ids.characters.has(b.character) && problems.push(`panel ${i}: unknown character ${b.character}`));
      p.speakers.forEach((l) => l.speaker !== "caption" && !onStage.has(l.speaker) && problems.push(`panel ${i}: speaker ${l.speaker} is not on stage`));
    });
    if (problems.length) throw new Error(problems.join("; "));
    console.log(`ok   ${file} (${doc.panels.length} panels)`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${file}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
