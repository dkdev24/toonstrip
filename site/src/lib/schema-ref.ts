/**
 * Schema reference rows generated from `packages/schema/src/schema.json` at
 * build time (SITE_DEV_PLAN.md §5.1): field names, types, required-ness, and
 * enum values are never hand-maintained here. The JSON Schema carries no
 * prose, so one-line descriptions live in DESCRIPTIONS below; a field the
 * schema gains without a description still appears (with an empty cell), so
 * the table cannot silently fall behind the schema.
 */
import schema from "../../../packages/schema/src/schema.json";

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  $ref?: string;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  definitions?: Record<string, JsonSchema>;
  title?: string;
}

const root = schema as unknown as JsonSchema;
const defs = root.definitions ?? {};

const DESCRIPTIONS: Record<string, string> = {
  "ComicStripDocument.version": "Document format version. Always 1 for now.",
  "ComicStripDocument.panels": "The strip, in reading order.",
  "Panel.backdrop": "Id of a backdrop declared by a registered pack. An unknown id is a load-time error.",
  "Panel.roomTitle": "Optional banner text drawn in the panel's top-left, like a location caption.",
  "Panel.dark": "Paint the panel black and omit the figures. Balloons still draw.",
  "Panel.camera": "Framing preset. Defaults to \"medium\".",
  "Panel.bodies": "Who is on stage, left to right.",
  "Panel.speakers": "Balloons, in draw order: the caption first, then each speaking body.",
  "Body.character": "Id of a character declared by a registered pack.",
  "Body.emotion": "Point on the emotion wheel that picks the face.",
  "Body.pose": "Gesture that claims the torso independently of the face.",
  "Body.requested": "Keep the body on stage even when it has no line this panel. Defaults to true for bodies with a line.",
  "Emotion.angle": "Radians around the wheel. 0 is HAPPY; each named emotion is π/4 further.",
  "Emotion.intensity": "0 to 1. 0 is NEUTRAL regardless of angle.",
  "Line.speaker": "A body's character id, or \"caption\" for the bodiless caption channel.",
  "Line.balloon": "Balloon shape. A caption speaker must use \"caption\".",
  "Line.text": "The words. Wrapped by the renderer; keep it short.",
};

export interface FieldRow {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface TypeRef {
  name: string;
  rows: FieldRow[];
  /** For enum-only definitions. */
  values?: string[];
}

function refName(ref: string): string {
  return ref.split("/").pop() ?? ref;
}

function typeOf(s: JsonSchema): string {
  if (s.$ref) return refName(s.$ref);
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.anyOf) return s.anyOf.map(typeOf).join(" | ");
  if (s.oneOf) return s.oneOf.map(typeOf).join(" | ");
  if (s.type === "array") return `${s.items ? typeOf(s.items) : "unknown"}[]`;
  if (Array.isArray(s.type)) return s.type.join(" | ");
  let t = s.type ?? "unknown";
  if (s.minimum !== undefined || s.maximum !== undefined) t += ` (${s.minimum ?? "…"}–${s.maximum ?? "…"})`;
  return t;
}

function rowsOf(typeName: string, s: JsonSchema): FieldRow[] {
  const required = new Set(s.required ?? []);
  return Object.entries(s.properties ?? {}).map(([name, prop]) => ({
    name,
    type: typeOf(prop),
    required: required.has(name),
    description: DESCRIPTIONS[`${typeName}.${name}`] ?? "",
  }));
}

/** Document root first, then definitions in declaration order. */
export function schemaReference(): TypeRef[] {
  const out: TypeRef[] = [{ name: root.title ?? "ComicStripDocument", rows: rowsOf("ComicStripDocument", root) }];
  for (const [name, def] of Object.entries(defs)) {
    if (def.enum) out.push({ name, rows: [], values: def.enum.map((v) => JSON.stringify(v)) });
    else out.push({ name, rows: rowsOf(name, def) });
  }
  return out;
}

export const schemaId: string = (schema as { $id?: string }).$id ?? "";
