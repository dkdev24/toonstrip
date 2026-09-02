import type { APIRoute } from "astro";
import { docsNav, docHref } from "../lib/docs-nav";

/**
 * llms-full.txt: every docs page as Markdown, concatenated. MDX bodies are
 * lightly cleaned: import lines and component tags (<CodeAndStrip …/>) are
 * dropped; the JSON those components render is inlined from the strips they
 * reference where the tag names an imported document.
 */
export const GET: APIRoute = async ({ site }) => {
  const { sorted } = await docsNav();
  const base = site?.origin ?? "https://toonstrip.danielkimdev.com";
  const parts: string[] = ["# toonstrip documentation", ""];
  for (const e of sorted) {
    const body = (e.body ?? "")
      .split("\n")
      .filter((line) => !/^import\s/.test(line))
      .join("\n")
      .replace(/<CodeAndStrip[^>]*doc=\{(\w+)\}[^>]*\/>/g, (_m, name) => `\n(Example strip \`${name}\` — see ${base}${docHref(e)} for the rendered version.)\n`)
      .replace(/<[A-Z][A-Za-z]*[^>]*\/>/g, "")
      .replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, "")
      .trim();
    parts.push(`---`, ``, `# ${e.data.title}`, ``, `> ${e.data.description}`, ``, `Source: ${base}${docHref(e)}`, ``, body, ``);
  }
  return new Response(parts.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
