import { getCollection, type CollectionEntry } from "astro:content";
import type { Lang } from "../i18n/utils";

export type DocEntry = CollectionEntry<"docs">;

export interface NavEntry {
  slug: string;
  order: number;
  section: string;
  title: string;
  description: string;
  href: string;
  /** True when `lang` has no translation yet and this is the EN fallback. */
  isFallback: boolean;
}

export interface NavSection {
  name: string;
  entries: NavEntry[];
}

const SECTION_ORDER = ["Start", "Authoring", "Integrate", "Reference"] as const;

/** Locale a docs entry belongs to, derived from its `<lang>/<slug>` id. */
export function docLang(entry: DocEntry): Lang {
  return entry.id.startsWith("ko/") ? "ko" : "en";
}

/** The slug portion of a docs entry's id, with the locale prefix stripped. */
export function docSlug(entry: DocEntry): string {
  return entry.id.replace(/^(en|ko)\//, "");
}

export function docHref(slug: string, lang: Lang): string {
  return lang === "ko" ? `/ko/docs/${slug}/` : `/docs/${slug}/`;
}

/**
 * Every doc slug for `lang`, sorted by `order` and grouped into sections in
 * canonical order. English is always the full set (source of truth); Korean
 * falls back to the English entry (frontmatter + title) for any slug that has
 * no `ko/*.mdx` yet, so the sidebar never omits a page and the language link
 * never 404s (SITE_DEV_PLAN.md §13.3).
 */
export async function docsNav(lang: Lang): Promise<{ sorted: NavEntry[]; sections: NavSection[] }> {
  const all = await getCollection("docs");
  const bySlug = new Map<string, Partial<Record<Lang, DocEntry>>>();
  for (const entry of all) {
    const slug = docSlug(entry);
    const rec = bySlug.get(slug) ?? {};
    rec[docLang(entry)] = entry;
    bySlug.set(slug, rec);
  }

  const sorted = [...bySlug.entries()]
    .map(([slug, rec]) => {
      const chosen = rec[lang] ?? rec.en;
      if (!chosen) return null;
      const navEntry: NavEntry = {
        slug,
        order: chosen.data.order,
        section: chosen.data.section,
        title: chosen.data.title,
        description: chosen.data.description,
        href: docHref(slug, lang),
        isFallback: lang !== "en" && !rec[lang],
      };
      return navEntry;
    })
    .filter((e): e is NavEntry => e !== null)
    .sort((a, b) => a.order - b.order);

  const sections = SECTION_ORDER.map((name) => ({
    name,
    entries: sorted.filter((e) => e.section === name),
  })).filter((s) => s.entries.length > 0);

  return { sorted, sections };
}

/** The English entry for `slug` — used as content when no KO translation exists. */
export async function docEnEntry(slug: string): Promise<DocEntry | undefined> {
  const all = await getCollection("docs");
  return all.find((e) => docLang(e) === "en" && docSlug(e) === slug);
}

/** The KO entry for `slug`, if a translation exists yet. */
export async function docKoEntry(slug: string): Promise<DocEntry | undefined> {
  const all = await getCollection("docs");
  return all.find((e) => docLang(e) === "ko" && docSlug(e) === slug);
}
