// ajv is CJS (no `"type": "module"` in its package.json) and needs a bundler
// to give this default import a real `default` export. In the browser that
// bundler is Vite, which normally arranges that automatically by
// pre-bundling every CJS dependency it discovers — but it discovers them by
// statically crawling import graphs from an entry point, and this module is
// reachable client-side only by way of an astro-island's fully
// runtime-computed `import(url)` (an Astro core mechanism, not something
// `@toonstrip/astro` controls), which isn't a graph a static crawl can walk
// into. So `@toonstrip/astro`'s integration (`integration.ts`) tells Vite
// about `ajv` directly via `optimizeDeps.include` — see the comment there
// for the consequence if that ever regresses (this import throws instead of
// resolving).
import Ajv, { type ErrorObject } from "ajv";
import schemaJson from "./schema.json" with { type: "json" };
import type { ComicStripDocument } from "./types.js";

const ajv = new Ajv({ allErrors: true, strict: true });
const validateFn = ajv.compile(schemaJson);

export class ComicStripValidationError extends Error {
  constructor(public readonly issues: ErrorObject[]) {
    super(
      `Invalid ComicStripDocument:\n${issues
        .map((issue) => `  ${issue.instancePath || "/"} ${issue.message}`)
        .join("\n")}`,
    );
    this.name = "ComicStripValidationError";
  }
}

// Structural validation only. Resolving `character`/`backdrop` ids against
// registered asset packs (§6 of the dev plan) happens once the pack system
// exists (M2+) — this function does not know about packs.
export function validateDocument(input: unknown): ComicStripDocument {
  if (!validateFn(input)) {
    throw new ComicStripValidationError(validateFn.errors ?? []);
  }
  return input as unknown as ComicStripDocument;
}
