"use client";

// The client-side, App-Router-safe boundary (dev plan §13.4): `@toonstrip/react`'s
// `<ComicStrip>` uses `useRef`/`useEffect`, so it must be marked a Client
// Component wherever a Server Component imports it. `packages/element`'s own
// SSR guards (customElements/HTMLElement) are what keep the *module* safe to
// import during the server render pass that still happens for a "use client"
// tree; this directive is the separate, RSC-protocol half of that story.
export { ComicStrip } from "@toonstrip/react";
export type { ComicStripProps, ComicStripPlaceholder } from "@toonstrip/react";
