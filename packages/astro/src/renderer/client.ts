import type { ComicStripElement } from "@toonstrip/element";

interface ComicStripProps {
  document?: unknown;
  packs?: string[];
}

/**
 * Maps a pack *name* (e.g. "comic-chat", per the dev plan's documented
 * `packs={['comic-chat']}` usage) to the URL the `toonstrip()` integration
 * copies that pack's assets to. See integration.ts's `astro:config:setup`.
 */
function packUrl(name: string): string {
  return `/_toonstrip/${name}/`;
}

export default (element: HTMLElement) => async (_component: string, props: ComicStripProps): Promise<void> => {
  // Deferred until the client directive's condition (e.g. `client:visible`)
  // fires — `@toonstrip/element` defines `<comic-strip>` at module scope via
  // `extends HTMLElement`, which would crash under Astro's SSR if imported
  // from anywhere reachable at render time. This dynamic import is the only
  // place in `@toonstrip/astro` that ever loads it.
  await import("@toonstrip/element");
  const target = element.children[0] as ComicStripElement | undefined;
  if (!target) return;
  if (props.document !== undefined) target.document = props.document as ComicStripElement["document"];
  if (props.packs) target.packs = props.packs.map(packUrl);
};
