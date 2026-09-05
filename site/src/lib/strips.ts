import type { ComicStripDocument } from "@toonstrip/schema";
import type { Lang } from "../i18n/utils";

const koStrips = import.meta.glob<{ default: ComicStripDocument }>("../content/strips/ko/*.json", { eager: true });

/**
 * Picks the Korean translation of a strip when one exists at
 * content/strips/ko/<name>.json (same panel/body/speaker structure, translated
 * dialogue only — SITE_DEV_PLAN.md §13.3), falling back to the English
 * original otherwise. `en` never 404s: it's the source of truth.
 */
export function localizedStrip(name: string, lang: Lang, en: ComicStripDocument): ComicStripDocument {
  if (lang !== "ko") return en;
  const mod = koStrips[`../content/strips/ko/${name}.json`];
  return mod ? mod.default : en;
}
