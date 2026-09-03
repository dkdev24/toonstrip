#!/usr/bin/env node
// Copies @toonstrip/pack-comic-chat's static files into public/packs/comic-chat/
// so Vite serves them over HTTP during `dev`/`build` — the Vite equivalent of
// what @toonstrip/astro's integration does at astro:config:setup (see
// packages/astro/src/integration.ts's copyPackAssets). Vite has no
// integration-hook system to run this automatically, so it's a pre* script
// instead. Same script as examples/react-vite's.
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packDir = dirname(require.resolve("@toonstrip/pack-comic-chat/package.json"));
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "packs", "comic-chat");

mkdirSync(dest, { recursive: true });
cpSync(join(packDir, "pack.json"), join(dest, "pack.json"));
for (const dir of ["characters", "backdrops"]) {
  const src = join(packDir, dir);
  if (existsSync(src)) cpSync(src, join(dest, dir), { recursive: true });
}
