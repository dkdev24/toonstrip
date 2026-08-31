/**
 * Zero-dependency, SSR-safe tag-name constant. Imported directly by consumers'
 * `.astro` frontmatter (which runs on the server), so this module must never
 * import anything that touches `HTMLElement`/`window` — `@toonstrip/element`
 * does exactly that at module scope, which is why it is imported only inside
 * `renderer/client.ts`, never from here.
 */
export const ComicStrip = "comic-strip";
