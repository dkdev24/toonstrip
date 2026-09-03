/**
 * `<ComicStrip>` — the React wrapper (dev plan §13.3). Mounts
 * `@toonstrip/element`'s `<comic-strip>` custom element via a ref and pushes
 * `document`/`packs` onto it as DOM properties whenever they change, the same
 * way `packages/astro`'s client renderer does — no rendering logic of its
 * own, same restraint the dev plan calls out for the Astro wrapper.
 *
 * The side-effect import below registers the element eagerly at module load.
 * That is fine for this package's target (a client-rendered React app); a
 * server-rendering wrapper (`@toonstrip/next`, M12) is what has to guard
 * against importing this on the server, not this package.
 */
import "@toonstrip/element";
import { createElement, useEffect, useRef, type CSSProperties, type ReactElement } from "react";
import type { ComicStripElement } from "@toonstrip/element";
import type { ComicStripDocument } from "@toonstrip/schema";

/** An SSR-rendered PNG (dev plan §13.4) to show until the live canvas paints — see `@toonstrip/next`'s `renderPlaceholder`. */
export interface ComicStripPlaceholder {
  /** Image URL — typically a `data:image/png;base64,...` URI from `renderPlaceholder`. */
  src: string;
  width: number;
  height: number;
}

export interface ComicStripProps {
  /** The strip to render (dev plan §3). Re-set on the element whenever this changes. */
  document: ComicStripDocument;
  /** Base URLs of registered asset packs, searched in order. Default `[]`. */
  packs?: string[];
  /**
   * A server-rendered placeholder to show until hydration paints the live
   * canvas (dev plan §13.4). Rendered as a light-DOM `<img>` so it is present
   * in the server HTML with no client JS — `@toonstrip/element` slots it in
   * and hides it itself once the live strip is ready, so no flicker even
   * between hydration and first paint.
   */
  placeholder?: ComicStripPlaceholder;
  className?: string;
  style?: CSSProperties;
}

export function ComicStrip({ document: doc, packs, placeholder, className, style }: ComicStripProps): ReactElement {
  const ref = useRef<ComicStripElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.document = doc;
  }, [doc]);

  useEffect(() => {
    if (ref.current) ref.current.packs = packs ?? [];
  }, [packs]);

  // Plain createElement, not JSX, for the custom element tag itself: React's
  // JSX.IntrinsicElements has no "comic-strip" entry, and createElement
  // sidesteps needing a global ambient-type augmentation just for one tag.
  return createElement(
    "comic-strip",
    { ref, className, style },
    placeholder
      ? createElement("img", {
          slot: "placeholder",
          src: placeholder.src,
          width: placeholder.width,
          height: placeholder.height,
          alt: "",
        })
      : null,
  );
}
