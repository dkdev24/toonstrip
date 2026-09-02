/**
 * Playground share links (SITE_DEV_PLAN.md §6.5). The document travels in the
 * URL *hash*, compressed with lz-string, so it never reaches the server or
 * analytics. Used at build time by CodeAndStrip ("Open in playground") and at
 * runtime by the playground, so this module must stay isomorphic: no DOM, no
 * Node built-ins.
 *
 * Format: `#d=<lz-string, URI-safe>[&p=<comma-separated pack names>]`
 * `p` is omitted when the packs are the default (`comic-chat` only).
 */
import LZString from "lz-string";
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString;
import type { ComicStripDocument } from "@toonstrip/schema";

export const DEFAULT_PACKS = ["comic-chat"] as const;

/** Compressed documents larger than this are refused on decode (abuse guard). */
export const MAX_HASH_LENGTH = 16_000;

export interface SharePayload {
  doc: ComicStripDocument;
  packs: string[];
}

export function encodeShareHash(doc: ComicStripDocument, packs: readonly string[] = DEFAULT_PACKS): string {
  const parts = [`d=${compressToEncodedURIComponent(JSON.stringify(doc))}`];
  const isDefault = packs.length === DEFAULT_PACKS.length && packs.every((p, i) => p === DEFAULT_PACKS[i]);
  if (!isDefault) parts.push(`p=${packs.map(encodeURIComponent).join(",")}`);
  return `#${parts.join("&")}`;
}

export function playgroundUrl(doc: ComicStripDocument, packs?: readonly string[]): string {
  return `/playground/${encodeShareHash(doc, packs)}`;
}

/**
 * Parse a hash back into a document. Returns `null` for a missing, oversized,
 * corrupt, or structurally-not-JSON payload — callers fall back to a preset.
 * Structural validation (`validateDocument`) is the caller's job, so this
 * module doesn't pull the validator into every page that only *builds* links.
 */
export function decodeShareHash(hash: string): { doc: unknown; packs: string[] } | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw || raw.length > MAX_HASH_LENGTH) return null;
  const params = new URLSearchParams(raw);
  const d = params.get("d");
  if (!d) return null;
  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(d);
  } catch {
    return null;
  }
  if (!json) return null;
  let doc: unknown;
  try {
    doc = JSON.parse(json);
  } catch {
    return null;
  }
  const p = params.get("p");
  const packs = p ? p.split(",").map(decodeURIComponent).filter(Boolean) : [...DEFAULT_PACKS];
  return { doc, packs };
}
