/**
 * Build schema.org FAQPage JSON-LD from a doc body written as `## question`
 * sections (the curated format of the FAQ pages). Answers are flattened to
 * plain text: markdown links keep their label, code spans keep their text.
 */
export function faqJsonLd(body: string): string {
  const text = body.replace(/^---[\s\S]*?---\s*/, "");
  const pairs: { q: string; a: string }[] = [];
  for (const section of text.split(/^## /m).slice(1)) {
    const nl = section.indexOf("\n");
    if (nl < 0) continue;
    const q = section.slice(0, nl).trim();
    const a = section
      .slice(nl + 1)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ");
    if (q && a) pairs.push({ q, a });
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  }).replace(/<\//g, "<\\/");
}
