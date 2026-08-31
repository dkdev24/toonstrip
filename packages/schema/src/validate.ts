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
