import { ComicStrip } from "../tag-name.js";

function check(Component: unknown): boolean {
  return Component === ComicStrip;
}

function renderToStaticMarkup(Component: string): { html: string } {
  // Real content only ever exists client-side (canvas rendering needs a real
  // browser canvas context) — the server placeholder is intentionally inert.
  // Props travel via Astro's own astro-island `props` attribute, not through
  // this markup, so nothing needs serializing into it.
  return { html: `<${Component}></${Component}>` };
}

export default { check, renderToStaticMarkup };
