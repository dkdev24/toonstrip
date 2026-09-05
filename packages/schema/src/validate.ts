import schemaData from "./schema-data.js";
import type { ComicStripDocument } from "./types.js";

export interface ValidationIssue {
  instancePath: string;
  message: string;
}

export class ComicStripValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(
      `Invalid ComicStripDocument:\n${issues
        .map((issue) => `  ${issue.instancePath || "/"} ${issue.message}`)
        .join("\n")}`,
    );
    this.name = "ComicStripValidationError";
  }
}

// The subset of JSON Schema draft-07 that schema.json actually uses.
interface JsonSchema {
  $ref?: string;
  type?: "object" | "array" | "string" | "number" | "boolean";
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minLength?: number;
}

const root = schemaData as unknown as JsonSchema & { definitions: Record<string, JsonSchema> };

function escapeSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function check(schema: JsonSchema, value: unknown, path: string, issues: ValidationIssue[]): void {
  if (schema.$ref) {
    check(root.definitions[schema.$ref.replace("#/definitions/", "")], value, path, issues);
    return;
  }
  if (schema.const !== undefined) {
    if (value !== schema.const) issues.push({ instancePath: path, message: "must be equal to constant" });
    return;
  }
  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      issues.push({ instancePath: path, message: "must be equal to one of the allowed values" });
    }
    return;
  }
  switch (schema.type) {
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        issues.push({ instancePath: path, message: "must be object" });
        return;
      }
      const obj = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (!(key in obj)) {
          issues.push({ instancePath: path, message: `must have required property '${key}'` });
        }
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(obj)) {
          if (!(key in (schema.properties ?? {}))) {
            issues.push({ instancePath: path, message: `must NOT have additional property '${key}'` });
          }
        }
      }
      for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
        if (key in obj) check(propSchema, obj[key], `${path}/${escapeSegment(key)}`, issues);
      }
      return;
    }
    case "array": {
      if (!Array.isArray(value)) {
        issues.push({ instancePath: path, message: "must be array" });
        return;
      }
      value.forEach((item, i) => check(schema.items!, item, `${path}/${i}`, issues));
      return;
    }
    case "string": {
      if (typeof value !== "string") {
        issues.push({ instancePath: path, message: "must be string" });
        return;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        issues.push({
          instancePath: path,
          message: `must NOT have fewer than ${schema.minLength} characters`,
        });
      }
      return;
    }
    case "number":
      if (typeof value !== "number") issues.push({ instancePath: path, message: "must be number" });
      return;
    case "boolean":
      if (typeof value !== "boolean") issues.push({ instancePath: path, message: "must be boolean" });
      return;
  }
}

// Structural validation only. Resolving `character`/`backdrop` ids against
// registered asset packs (§6 of the dev plan) happens once the pack system
// exists (M2+) — this function does not know about packs.
export function validateDocument(input: unknown): ComicStripDocument {
  const issues: ValidationIssue[] = [];
  check(root, input, "", issues);
  if (issues.length > 0) throw new ComicStripValidationError(issues);
  return input as ComicStripDocument;
}
