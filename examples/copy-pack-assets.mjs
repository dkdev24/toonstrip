#!/usr/bin/env node
// Copies @toonstrip/pack-comic-chat's static files into public/packs/comic-chat/ so
// each example serves them over HTTP during dev/build — the framework-agnostic
// equivalent of what @toonstrip/astro's integration does at astro:config:setup (see
// packages/astro/src/integration.ts's copyPackAssets). Shared by react-vite, vue-vite
// and next-app, each of which runs it via a pre*/predev script with its own package
// root as cwd, so resolution and the destination path are both rooted at cwd.
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(pathToFileURL(join(process.cwd(), "package.json")));
const packDir = dirname(require.resolve("@toonstrip/pack-comic-chat/package.json"));
const dest = join(process.cwd(), "public", "packs", "comic-chat");

mkdirSync(dest, { recursive: true });
cpSync(join(packDir, "pack.json"), join(dest, "pack.json"));
for (const dir of ["characters", "backdrops"]) {
  const src = join(packDir, dir);
  if (existsSync(src)) cpSync(src, join(dest, dir), { recursive: true });
}
