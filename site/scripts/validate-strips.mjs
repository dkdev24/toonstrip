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

// Parity: every ko/<name>.json must match the structure of its EN counterpart
// (panel count, bodies character/pose order, speakers speaker/balloon order).
// Only text/roomTitle are allowed to differ.
const koDir = new URL("ko/", dir);
for (const file of readdirSync(koDir).filter((f) => f.endsWith(".json"))) {
  const enUrl = new URL(file, dir);
  const koUrl = new URL(file, koDir);
  const en = JSON.parse(readFileSync(enUrl, "utf-8"));
  const ko = JSON.parse(readFileSync(koUrl, "utf-8"));
  const problems = [];
  if (en.panels.length !== ko.panels.length) {
    problems.push(`panel count ${ko.panels.length} !== EN ${en.panels.length}`);
  } else {
    en.panels.forEach((enPanel, i) => {
      const koPanel = ko.panels[i];
      const enBodies = enPanel.bodies.map((b) => `${b.character}/${b.pose ?? ""}`);
      const koBodies = koPanel.bodies.map((b) => `${b.character}/${b.pose ?? ""}`);
      if (enBodies.join(",") !== koBodies.join(",")) {
        problems.push(`panel ${i}: bodies [${koBodies}] !== EN [${enBodies}]`);
      }
      const enSpeakers = enPanel.speakers.map((s) => `${s.speaker}/${s.balloon}`);
      const koSpeakers = koPanel.speakers.map((s) => `${s.speaker}/${s.balloon}`);
      if (enSpeakers.join(",") !== koSpeakers.join(",")) {
        problems.push(`panel ${i}: speakers [${koSpeakers}] !== EN [${enSpeakers}]`);
      }
    });
  }
  if (problems.length) {
    failed++;
    console.error(`FAIL ko/${file}: ${problems.join("; ")}`);
  } else {
    console.log(`ok   ko/${file} (parity with ${file})`);
  }
}

process.exit(failed ? 1 : 0);
