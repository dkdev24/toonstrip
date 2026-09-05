import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { docLang, docSlug, docHref } from "../lib/docs-nav";

/**
 * llms-full.txt: every docs page as Markdown, concatenated. EN docs only
 * (SITE_DEV_PLAN.md §13.3). MDX bodies are lightly cleaned: import lines and
 * component tags (<CodeAndStrip …/>) are dropped; the JSON those components
 * render is inlined from the strips they reference where the tag names an
 * imported document.
 */
export const GET: APIRoute = async ({ site }) => {
  const all = await getCollection("docs", (e) => docLang(e) === "en");
  const sorted = [...all].sort((a, b) => a.data.order - b.data.order);
  const base = site?.origin ?? "https://toonstrip.danielkimdev.com";
  const parts: string[] = ["# toonstrip documentation", ""];
  for (const e of sorted) {
    const href = docHref(docSlug(e), "en");
    const body = (e.body ?? "")
      .split("\n")
      .filter((line) => !/^import\s/.test(line))
      .join("\n")
      .replace(/<CodeAndStrip[^>]*doc=\{(\w+)\}[^>]*\/>/g, (_m, name) => `\n(Example strip \`${name}\` — see ${base}${href} for the rendered version.)\n`)
      .replace(/<[A-Z][A-Za-z]*[^>]*\/>/g, "")
      .replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, "")
      .trim();
    parts.push(`---`, ``, `# ${e.data.title}`, ``, `> ${e.data.description}`, ``, `Source: ${base}${href}`, ``, body, ``);
  }
  return new Response(parts.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
