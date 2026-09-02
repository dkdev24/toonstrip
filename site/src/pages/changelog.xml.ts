import type { APIRoute } from "astro";
import { changelogVersions } from "../data/changelog";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Atom feed of the changelog. Entry content is the Markdown as text. */
export const GET: APIRoute = async ({ site }) => {
  const base = site?.origin ?? "https://toonstrip.danielkimdev.com";
  const versions = await changelogVersions();
  const updated = versions[0]?.date ? `${versions[0].date}T00:00:00Z` : new Date().toISOString();
  const entries = versions
    .map(
      (v) => `  <entry>
    <title>${esc(`toonstrip ${v.version}`)}</title>
    <id>${base}/changelog/#${v.slug}</id>
    <link href="${base}/changelog/#${v.slug}"/>
    <updated>${v.date}T00:00:00Z</updated>
    <summary>${esc(v.packages)}</summary>
    <content type="text">${esc(v.body)}</content>
  </entry>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>toonstrip changelog</title>
  <id>${base}/changelog/</id>
  <link href="${base}/changelog/"/>
  <link rel="self" href="${base}/changelog.xml"/>
  <updated>${updated}</updated>
  <author><name>Daniel Kim</name></author>
${entries}
</feed>
`;
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
};
