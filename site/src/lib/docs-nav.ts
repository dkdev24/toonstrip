import { getCollection, type CollectionEntry } from "astro:content";

export type DocEntry = CollectionEntry<"docs">;

export interface NavSection {
  name: string;
  entries: DocEntry[];
}

const SECTION_ORDER = ["Start", "Authoring", "Integrate", "Reference"] as const;

/** All docs, sorted by `order`, and grouped into sections in canonical order. */
export async function docsNav(): Promise<{ sorted: DocEntry[]; sections: NavSection[] }> {
  const all = await getCollection("docs");
  const sorted = [...all].sort((a, b) => a.data.order - b.data.order);
  const sections = SECTION_ORDER.map((name) => ({
    name,
    entries: sorted.filter((e) => e.data.section === name),
  })).filter((s) => s.entries.length > 0);
  return { sorted, sections };
}

export function docHref(entry: DocEntry): string {
  return `/docs/${entry.id}/`;
}
