// The validator is precompiled to plain JS at build time (ajv's "standalone"
// mode — see scripts/generate-validator.mjs) rather than compiled from
// schema.json at runtime via `ajv.compile()`. Runtime compilation generates
// and executes code through `new Function(...)`, which needs `unsafe-eval` in
// a page's CSP; consumers that disallow it (e.g. `danielkimdev-astro`'s
// deployed CSP) got a silent hydration failure. Precompiling removes `ajv`
// and all `eval`-family calls from the shipped runtime entirely.
import type { ErrorObject } from "ajv";
import validateFn from "./generated-validate.js";
import type { ComicStripDocument } from "./types.js";

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
