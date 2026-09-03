#!/usr/bin/env node
// Same job as examples/react-vite's copy-pack-assets.mjs: Next has no
// integration-hook system either, so the pack's static files are copied into
// public/packs/comic-chat/ for the client-side cast fetch to find over HTTP.
// The server-side placeholder render (app/page.tsx) reads the pack directly
// from node_modules instead — see @toonstrip/next/server's renderPlaceholder.
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
