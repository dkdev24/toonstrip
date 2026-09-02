/**
 * Parse CHANGELOG.md (Keep a Changelog form) into versions for the page's
 * version list and the Atom feed. The page body itself is rendered by Astro
 * from the collection entry; this only reads structure.
 */
import { getEntry } from "astro:content";

export interface ChangelogVersion {
  version: string;
  date: string;
  /** Slug Astro's markdown pipeline gives the `## x.y.z — date` heading. */
  slug: string;
  packages: string;
  /** Raw Markdown of the entry, heading excluded. */
  body: string;
}

export async function changelogVersions(): Promise<ChangelogVersion[]> {
  const entry = await getEntry("changelog", "changelog");
  const md = entry?.body ?? "";
  const parts = md.split(/\n(?=## )/).filter((p) => p.startsWith("## "));
  return parts.map((part) => {
    const [heading, ...rest] = part.split("\n");
    const m = /^## (\S+) — (\d{4}-\d{2}-\d{2})/.exec(heading);
    const version = m?.[1] ?? heading.slice(3);
    const date = m?.[2] ?? "";
    const body = rest.join("\n").trim();
    const pk = /\*\*Packages:\*\* (.+)/.exec(body);
    return {
      version,
      date,
      slug: `${version.replace(/\./g, "")}--${date}`,
      packages: pk?.[1] ?? "",
      body,
    };
  });
}
