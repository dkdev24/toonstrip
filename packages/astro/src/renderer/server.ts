import { ComicStrip } from "../tag-name.js";

// A rough one-row guess at the element's eventual height (mirrors
// `@toonstrip/core`'s native panel height, `layout.ts`'s `UNIT.height`, kept
// as a local literal rather than a dependency so this SSR-only module stays
// light). It only has to be non-zero — see the comment in
// `renderToStaticMarkup` below — the element re-measures and repaints for
// real once `@toonstrip/element` upgrades it.
const PLACEHOLDER_HEIGHT = 340;

function check(Component: unknown): boolean {
  return Component === ComicStrip;
}

function renderToStaticMarkup(Component: string): { html: string } {
  // Real content only ever exists client-side (canvas rendering needs a real
  // browser canvas context) — the server placeholder is intentionally inert.
  // Props travel via Astro's own astro-island `props` attribute, not through
  // this markup, so nothing needs serializing into it.
  //
  // It does need a non-zero box, though. Before `@toonstrip/element` upgrades
  // this tag, `<comic-strip>` is an unrecognized custom element — `display:
  // inline`, no content, zero-size — and Chromium never reports a zero-area
  // target as intersecting, so `client:visible` (which hydrates on the
  // element's own IntersectionObserver entry) would never fire no matter how
  // long the reader scrolls, on any page that uses that directive.
  return {
    html: `<${Component} style="display:block;min-height:${PLACEHOLDER_HEIGHT}px"></${Component}>`,
  };
}

export default { check, renderToStaticMarkup };
