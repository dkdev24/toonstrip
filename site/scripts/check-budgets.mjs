// Per-route gzipped JS budgets (SITE_DEV_PLAN.md §8). Walks each built HTML's
// module scripts and everything they import (static and dynamic), so lazily
// loaded chunks like @toonstrip/element count against the page that loads them.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname, resolve } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BUDGETS = [
  { route: "/", limit: 60 },
  { route: "/docs/getting-started/", limit: 40 },
  { route: "/docs/emotions-and-poses/", limit: 40 },
  { route: "/changelog/", limit: 40 },
  { route: "/playground/", limit: 450 },
];

function html(route) {
  return readFileSync(join(dist, route, "index.html"), "utf-8");
}
const gz = new Map();
function gzipSize(file) {
  if (!gz.has(file)) gz.set(file, gzipSync(readFileSync(file)).length);
  return gz.get(file);
}
function reachable(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = readFileSync(entry, "utf-8");
  for (const m of src.matchAll(/(?:import\(|from\s*|import\s*)["']([^"']+\.js)["']/g)) {
    const target = resolve(dirname(entry), m[1]);
    try {
      statSync(target);
      reachable(target, seen);
    } catch {}
  }
  return seen;
}
let failed = false;
for (const { route, limit } of BUDGETS) {
  const page = html(route);
  const scripts = [...page.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const islands = [...page.matchAll(/component-url="([^"]+)"/g)].map((m) => m[1]);
  const rendererUrls = [...page.matchAll(/renderer-url="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  for (const url of [...scripts, ...islands, ...rendererUrls]) {
    if (!url.startsWith("/")) continue;
    reachable(join(dist, url), seen);
  }
  const total = [...seen].reduce((n, f) => n + gzipSize(f), 0) / 1024;
  const ok = total <= limit;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${route.padEnd(28)} ${total.toFixed(1).padStart(7)} KB gz / ${limit} KB  (${seen.size} files)`);
}
process.exit(failed ? 1 : 0);
