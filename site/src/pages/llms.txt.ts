import type { APIRoute } from "astro";
import { docsNav, docHref } from "../lib/docs-nav";
import { coreVersion } from "../lib/version";

/** llms.txt: an index for agents integrating toonstrip. */
export const GET: APIRoute = async ({ site }) => {
  const { sections } = await docsNav();
  const base = site?.origin ?? "https://toonstrip.danielkimdev.com";
  const lines = [
    "# toonstrip",
    "",
    `> A framework-embeddable library (v${coreVersion}, MIT) that renders comic strips from caller-supplied JSON as live, responsive canvas widgets. Astro integration; plain-HTML custom element. No AI, no content generation: you supply panels, characters, emotion, and dialogue as data.`,
    "",
    `Full docs as one Markdown file: ${base}/llms-full.txt`,
    "",
  ];
  for (const s of sections) {
    lines.push(`## ${s.name}`, "");
    for (const e of s.entries) lines.push(`- [${e.data.title}](${base}${docHref(e)}): ${e.data.description}`);
    lines.push("");
  }
  lines.push("## Other", "", `- [Playground](${base}/playground/): edit a document and see it render`, `- [Changelog](${base}/changelog/)`, `- [Repository](https://github.com/dkdev24/toonstrip)`, `- [npm](https://www.npmjs.com/org/toonstrip)`, "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
