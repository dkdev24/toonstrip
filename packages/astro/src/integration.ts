import type { AstroIntegration } from "astro";

export interface ToonstripOptions {
  /**
   * Module specifiers of `@toonstrip/pack-*` packages to serve to the browser.
   * Each pack's `pack.json` + `characters/` + `backdrops/` are copied into the
   * site's public dir under `_toonstrip/<pack.json name>/` at config-setup
   * time, so `<ComicStrip packs={['comic-chat']} />` can resolve the name to
   * a URL `@toonstrip/element`'s fetch-based loader can reach. No
   * auto-discovery — packs used by a page must be listed explicitly here.
   */
  packs?: string[];
}

// Node built-ins are imported dynamically, inside the hook body, rather than
// at module scope: this same module is also re-imported client-side (Astro's
// hydration re-fetches the astro-island's `component-url`, and `ComicStrip`
// lives in this package's index alongside `toonstrip`) — a static top-level
// `node:fs`/`node:module` import breaks there ("externalized for browser
// compatibility"), even though the function body itself never runs in a
// browser. Dynamic imports keep this module's top level browser-safe.
async function copyPackAssets(specifier: string, publicDir: string): Promise<void> {
  const { createRequire } = await import("node:module");
  const { cpSync, existsSync, mkdirSync, readFileSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");

  const require = createRequire(import.meta.url);
  const packDir = dirname(require.resolve(`${specifier}/package.json`));
  const packJsonPath = join(packDir, "pack.json");
  const packJson = JSON.parse(readFileSync(packJsonPath, "utf-8")) as { name: string };

  const dest = join(publicDir, "_toonstrip", packJson.name);
  mkdirSync(dest, { recursive: true });
  cpSync(packJsonPath, join(dest, "pack.json"));
  for (const dir of ["characters", "backdrops"]) {
    const src = join(packDir, dir);
    if (existsSync(src)) cpSync(src, join(dest, dir), { recursive: true });
  }
}

export default function toonstrip(options: ToonstripOptions = {}): AstroIntegration {
  return {
    name: "@toonstrip/astro",
    hooks: {
      "astro:config:setup": async ({ addRenderer, config }) => {
        addRenderer({
          name: "@toonstrip/astro",
          // Bare specifiers (not `new URL(...).href`) so Vite can place these
          // in its normal module graph — a raw file:// URL renders fine in
          // dev but breaks `astro build`'s static-output "built path" lookup,
          // which only resolves entrypoints it can trace through that graph.
          serverEntrypoint: "@toonstrip/astro/dist/renderer/server.js",
          clientEntrypoint: "@toonstrip/astro/dist/renderer/client.js",
        });

        // Historical note: this hook used to also add `ajv` to
        // `vite.optimizeDeps.include`, because `@toonstrip/schema` used to
        // `import Ajv from "ajv"` and compile the JSON Schema into a
        // validator function at runtime — reachable client-side only through
        // an astro-island's fully runtime-computed `import(this.component-
        // url)`, invisible to Vite dev's static dependency crawl, so `ajv`'s
        // CJS/ESM interop had to be forced via `optimizeDeps.include`.
        // `@toonstrip/schema` now ships a build-time-precompiled, ajv-free
        // validator (also fixes `new Function()`-based compilation needing
        // `unsafe-eval` in a page's CSP — see its own source comments), so
        // nothing here imports `ajv` anymore and this hook no longer needs
        // to touch Vite config at all.

        const { fileURLToPath } = await import("node:url");
        const publicDir = fileURLToPath(config.publicDir);
        for (const specifier of options.packs ?? []) {
          await copyPackAssets(specifier, publicDir);
        }
      },
    },
  };
}
