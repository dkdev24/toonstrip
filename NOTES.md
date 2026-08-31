# NOTES.md

Items flagged during autonomous M1–M5 work that need Daniel's review. Not cross-session
state (see `HANDOFF.md`/`WORKLOG.md` for that) — this is a punch list, cleared out or
resolved as items get addressed. Newest at bottom, grouped by milestone.

## M1

- **`Panel.backdrop` is a required `string` in the schema, with no `"none"` sentinel.**
  The fixture cast and example script pass real backdrop ids everywhere; `render.ts`'s
  `drawBackdrop` already handles an id with no matching image gracefully (falls back to
  a plain fill), so this works today, but there's no documented "no backdrop" convention.
  Worth deciding in M2/M5 docs whether an unmatched id silently falling back to a plain
  fill is the permanent contract, or whether `backdrop` should become optional.
- **`Body.pose` gesture mapping is a judgment call, not in the dev plan.** Schema only
  exposes 3 gestures (`wave`/`point`/`shrug`) vs. the original 8-gesture set. I mapped
  them to the emotion-wheel sentinel angles used by `wave`→1001, `point`→1002
  (`POINTOTHER`), `shrug`→1005, and built a small priority-ordered `EmotionOption[]`
  helper (`emotionOptionsFor` in `render.ts`) so a gesture claims the torso while the
  body's own `emotion` still claims the face. This is a reasonable reading of the dev
  plan's "gesture sentinel, ported from the wheel's >2π gesture values" note, but it's
  new design, not a straight port — worth a look.
- **Balloon-kind naming simplified.** Original code used internal Comic Chat class names
  (`CBWoodringNormal`/`CBWoodringThink`/`CBWoodringBox`); this port uses the schema's own
  `BalloonKind` (`"speech"|"thought"|"caption"`) throughout `packages/core` instead of
  re-introducing the old names — one less layer of indirection, and it matches what the
  schema already calls things. Flagging in case this reads as a bigger deviation than intended.
- **`web/src/comic/backdrop.ts` was not ported at all** — confirmed its only generic
  content (a `BackdropId` type + `ROOM_BACKDROPS`/`backdropFor`) is entirely the Zork
  room-graph, which the dev plan already says to drop. The "generalized BackdropId-keyed
  lookup shape" mentioned in §1 turned out to already live in `render.ts`'s
  `drawBackdrop`/`Cast.backdrops` (ported), so there was nothing left in `backdrop.ts`
  itself worth porting. Confirm this reading is right before M2 assumes otherwise.
- **Browser cast-loading (`loadCast`/`loadRoster`, `fetch`-based) was dropped from the
  M1 port.** `figure.ts` in `grues-in-comic` mixes pose/compositing logic with a
  browser-only asset loader; M1 is Node-only per the milestone table ("no web component
  yet"), so I ported only the pure logic (`Cast`, `Figure`, `figureFor`, `drawFigure`,
  `PoseCycle`) and left cast loading for M3 (`packages/element`) or M2, whichever ends up
  owning it — a caller builds a `Cast` object directly for now (see the fixture builder
  in `packages/core/test/fixtures/cast.ts`).
- **No real character art in M1, as the milestone table specifies** — `packages/core`'s
  tests and example script use procedurally-drawn placeholder shapes (colored rects/
  circles), not the real Comic Chat roster. M2 is expected to swap this fixture cast out
  for the real decoded pack; nothing in `packages/core`'s public API should need to
  change for that (it already consumes the `CastManifest`/`PackedAvatar` shape M2's pack
  is expected to produce), but this hasn't been proven against real decoded art yet.
- **Existing `grues-in-comic` test suites for these modules (`render.test.ts`,
  `balloon.test.ts`, `balloon-layout.test.ts`, `figure.test.ts`, `layout.test.ts`,
  1018 lines total) were not ported verbatim** — many exercise the packed 15-character
  roster and Zork-specific fixtures directly. I wrote fresh, smaller unit tests against
  the same ported functions instead (26 tests: pose selection, balloon wrap/measure,
  multi-balloon layout incl. force-fit and determinism, a fixture 3-panel render, and a
  dark-panel check). Worth a pass later to see if any specific *case* from the original
  suites (an edge case, a regression test for a named bug) should be back-ported
  individually rather than relying on my fresh coverage.
- **`splitHeight`/force-fit path is real, not dead code** — initially assumed it was
  page.ts-only (multi-panel overflow) and skippable for M1; on closer reading it's used
  by `balloon-layout.ts`'s single-balloon force-fit path too, so it's ported and tested
  (`balloon-layout.test.ts`'s force-fit case).

## M2

- **`CastManifest`/`PackedAvatar`/etc. live in `packages/core`, not `packages/schema`,**
  but §2 says "asset packs depend on schema only." `pack-comic-chat` does not import
  `@toonstrip/core` — it re-declares the same shapes locally in its own `src/types.ts`
  and relies on TypeScript structural typing to unify with `packages/core`'s types at
  the point a caller (e.g. `packages/core`'s own test fixtures, or a future
  `packages/element`) passes pack data into the renderer. This works and keeps the
  dependency graph one-way, but it's a duplicated-type situation. Worth a cleanup pass:
  move `cast-manifest.ts`'s types from `packages/core` into `packages/schema` so both
  `packages/core` and every pack package can import one shared definition instead of
  structurally-compatible copies.
- **`packages/pack-comic-chat` ships zero runtime dependencies** (not even
  `@toonstrip/schema`) — a pack is JSON + PNGs + a thin `node:fs`-based loader, nothing
  in it actually needs schema types. `@napi-rs/canvas`/`@types/node` are devDependencies
  only, used by `scripts/convert-backdrops.mjs` (a one-time build tool, not shipped —
  see `files` in its `package.json`) and by the test suite.
- **Backdrop BMP decoder was rewritten minimally, not ported file-for-file.** Rather than
  porting `grues-in-comic`'s `art/src/{image,reader,format,inflate}.ts` wholesale (most
  of which handles `.avb`-only concerns: LZDEFLATE streams, mask palettes, global
  palettes — none of which apply to a bare 4bpp RLE4 `.bmp`), I wrote a ~140-line
  self-contained decoder (`packages/pack-comic-chat/scripts/convert-backdrops.mjs`)
  covering only the `AIF_DIB` + `BI_RLE4`/`BI_RLE8` path actually needed for `field`/
  `pastoral`/`room8bs`. Verified against all 3 files (RLE4, 315x315, 16-color palette).
  Output PNGs were checked for pixel variety (15/15/15+ unique colors) and correct
  dimensions, not compared pixel-for-pixel against a reference render (no ground-truth
  PNG exists to diff against) — worth an eyeball pass on the actual images.
- **`toonstrip pack validate` implements only the "at minimum NEUTRAL" gate from §6**,
  not the full per-role `ROLE_FACE_REQUIREMENTS` inventory check `grues-in-comic`'s
  `roster.test.ts` does (that check is role-aware — hero vs. guide need different face
  sets — and toonstrip's schema has no "role" concept, only character ids). It also
  checks PNG dimensions declared in `pack.json` against the actual file's IHDR chunk.
  Collision detection across multiple registered packs (§6's "collision = build-time
  error, not silent shadowing") is NOT implemented — `packages/cli` only validates one
  pack directory at a time; multi-pack registration doesn't exist yet (no consumer of
  more than one pack exists until `packages/element`/`astro`).
- **`docs/packs.md` (§6: "document the contribution path before v0.1.0") was not
  written this milestone** — M5 is where docs land per the milestone table; flagging so
  it isn't dropped.
- **Sheet/backdrop file paths in the runtime `CastManifest`** (`loadCastManifest()`'s
  output) are rewritten to absolute filesystem paths at load time (`join(PACK_ROOT, ...)`)
  rather than left pack-relative. This suits every current caller (Node scripts, Node
  test fixtures) but will need revisiting once a browser consumer (`packages/element`,
  M3) exists — a browser can't `node:fs` its way to an absolute path; it'll need URLs
  instead. Flagging now so M3 doesn't have to rediscover this.

## M3

- **`@toonstrip/schema`'s ajv dependency has no ESM/browser build — a real gap, not just
  a demo inconvenience.** `packages/element/demo/index.html` needs an import map to run
  with no bundler, and ajv (CJS-only, no `"exports"`/`"module"` field) can't be resolved
  by a bare-specifier import in a plain `<script type="module">`. The demo works around
  it by pointing the import map's `"ajv"` entry at a CDN ESM build
  (`https://esm.sh/ajv@8.17.1`) — fine for this one demo page, not something to ship as
  the real answer. §5's whole premise is that `<comic-strip>` "works identically in
  Astro, plain HTML, and any other framework's escape hatch" with zero framework deps;
  a plain-HTML consumer hitting an unresolvable transitive dependency undermines that for
  anyone not using a bundler. Worth deciding before M6: pre-bundle `@toonstrip/schema`'s
  validator for browser consumers (e.g. ship a bundled `dist/browser.js` with ajv inlined),
  or replace ajv with a validator that has both a CJS and a real ESM/browser build.
- **Browser pack loading (`packages/element/src/load-pack.ts`) is new work, not a port**
  — `grues-in-comic` never had a "fetch a pack from a URL" concept; the closest reference
  (`loadCast`/`loadRoster` in the pre-M1 `figure.ts`) was already dropped in M1. Implements
  §6's "collision = build-time error, not silent shadowing" for real (checks every
  registered pack for a duplicate id, not just the first match) — this is the first place
  in the repo that rule is actually enforced; `packages/cli`'s `pack validate` (M2) only
  checks one pack directory at a time.
- **`<comic-strip>`'s API surface is a judgment call**: `.document` (property, matches
  §7's Astro example) and `.packs` (array of base URLs, property) plus a `src` attribute
  as a convenience for fetching a document from a URL. The dev plan's Astro snippet shows
  `packs={['comic-chat']}` (pack *names*), which only makes sense once a bundler/npm can
  resolve a name to a URL (Astro's job, presumably) — the raw element has no such
  resolution mechanism, so it takes URLs directly. Confirm this split (name-resolution is
  an Astro-layer concern, the element only knows URLs) is the intended design before M4.
- **No internal scroll pane.** `comic-view.ts`'s `IntersectionObserver` used `root: strip`
  (an internal fixed-height, scrolling container) because Comic Chat's window was exactly
  that. `<comic-strip>` assumes the *host page* scrolls instead (no internal scrollbar),
  so it uses `root: null` (the viewport) — a deliberate deviation, not an oversight, but
  worth confirming it's the right default for e.g. a very long strip embedded in a short
  iframe.
- **The whole turn/session/incremental-append half of `comic-view.ts` was dropped**, not
  just trimmed — `appendTurn`/`flush`/scroll-pinning/`frozen`-on-append are how a live game
  streamed panels in one at a time. `<comic-strip>` renders a complete `ComicStripDocument`
  handed over once (dev plan §0's non-goal: "no game/session/turn engine"), so pose-cycle
  freezing happens once, up front, for the whole document in panel order, rather than
  per-append. This is the correct read of the non-goal, but it's a bigger structural cut
  than "port the mechanism, strip the app chrome" might suggest — flagging so it's a
  deliberate read, not an accidental omission, on your radar.
- **`#measure()`'s padding subtraction was a real bug I caught via the live-browser
  check, not a hypothetical**: an earlier version used the host's raw `clientWidth`
  (which includes the host's own CSS padding) as available width for `layoutStrip`,
  over-estimating space and risking grid-track overflow past the element's actual content
  box. Fixed to subtract `getComputedStyle(this)`'s padding, matching `comic-view.ts`'s
  own `measure()` pattern. Mentioning because the demo's `body { max-width: 1100px }`
  also had to be loosened for the fix to still exercise a real 3-column layout in the demo
  viewport — cosmetic, but explains why the demo's CSS looks different from a first draft.
- **Exit-criteria verification used a real headless Chromium (Playwright), not just
  jsdom mocks.** `packages/element/scripts/verify-demo.mjs` loads the actual demo page
  (served via `python3 -m http.server` over the real `pack-comic-chat` assets), resizes
  across three breakpoints, confirms `layoutStrip`'s 3/2/1-column policy live, checks
  real non-blank canvas output and ARIA labels, and runs `axe-core` — result: 0 axe
  violations, 0 console errors, correct columns at all three widths. This is NOT wired
  into `pnpm test`/CI (downloading a ~270 MB Chromium isn't in `ci.yml`'s current steps);
  it's a manual verification script (`pnpm --filter @toonstrip/element run verify:demo`,
  server must be started separately) for now. Decide before M6 whether to wire a
  `playwright install --with-deps chromium` step into CI so this runs automatically, or
  leave it as a manual pre-release check.
- **`packages/element`'s jsdom-based unit tests (`comic-strip-element.test.ts`) stub
  `ResizeObserver`/`IntersectionObserver`/`Image`/`fetch` and mock `getContext` to return
  `null`** (jsdom has no real canvas 2D context without the native `canvas` package,
  which I deliberately did not add as a devDependency just for tests). These tests prove
  wiring (canvas count, ARIA attributes, column recompute on a simulated resize), not
  actual pixel output — that proof is `packages/core`'s fixture render plus the real-
  browser `verify-demo.mjs` run above.

## M4

- **`client:visible` on a framework-less custom element required writing a small custom
  Astro renderer (`packages/astro/src/renderer/{server,client}.ts`), not using
  `@astrojs/lit`.** I checked `@astrojs/lit`'s real `check()` implementation (in its
  installed `server.js`): it requires the tag's registered constructor to carry Lit's
  private `_$litElement$` marker, i.e. the element must actually be authored as a
  `LitElement` subclass. `packages/element`'s `ComicStripElement` extends plain
  `HTMLElement` (dev plan §2 requires `packages/element` to have zero framework deps), so
  `@astrojs/lit` would reject it outright. The renderer I wrote instead: `check()`
  matches only the literal `"comic-strip"` string; `renderToStaticMarkup()` emits an
  inert `<comic-strip></comic-strip>` placeholder (there's no meaningful SSR output —
  real rendering needs a live canvas context); `client.ts`'s hydrate function does
  `await import("@toonstrip/element")` itself (registering the custom element) only when
  the directive's condition fires, then sets `.document`/`.packs` as JS properties. This
  is a genuinely new, hand-rolled integration with Astro's (undocumented-for-this-case
  but stable-looking) renderer contract — worth a second pair of eyes before relying on
  it across Astro major versions; only tested against Astro 7.2.9.
- **Two real bugs found and fixed only by actually running a browser, not by reasoning
  about the code:** (1) initial version had the tag-name constant and the element-
  defining class in the same module, which crashed Astro's SSR (`HTMLElement is not
  defined` in Node) — fixed by splitting `tag-name.ts` (SSR-safe) from
  `@toonstrip/element`'s self-registering module (browser-only, dynamically imported
  only inside `client.ts`). (2) `packages/astro/src/index.ts` re-exports both the
  browser-safe `ComicStrip` constant and the Node-only `toonstrip` integration from one
  entry — since Astro's hydration re-imports that *same* entry client-side to fetch the
  live `ComicStrip` binding, `integration.ts`'s top-level `node:fs`/`node:module` imports
  got Vite-externalized and threw when the browser evaluated them. Fixed by moving those
  imports to `await import(...)` inside the (never-invoked-client-side) hook body. Both
  bugs were invisible from a build/typecheck pass alone — `astro build` did not catch
  either one at first; only actually loading the page in headless Chromium did. Flagging
  this pattern in case future milestones assume "build succeeds" is sufficient proof.
- **The pack-name-vs-URL question flagged in M3's notes is resolved at the Astro layer
  only** — `packages/element`'s `.packs` API is untouched (still base URLs). §7's own
  snippet (`packs={['comic-chat']}`) shows pack *names*; `toonstrip({ packs: [...] })`
  (an integration option, module specifiers of `@toonstrip/pack-*` packages) copies each
  named pack's `pack.json`+`characters/`+`backdrops/` into the site's
  `public/_toonstrip/<pack.json name>/` at `astro:config:setup` time, and
  `renderer/client.ts` maps a name the page wrote (e.g. `"comic-chat"`) to
  `/_toonstrip/comic-chat/` by convention before setting `.packs`. No auto-discovery of
  installed packs — every pack a site uses must be named explicitly in `toonstrip()`'s
  options. `examples/astro-blog/public/_toonstrip/` is gitignored (regenerated by
  `astro dev`/`astro build` every run, not source) — a fresh clone must run one of those
  once before the copied assets exist; this is expected integration behavior, not a bug.
- **`devToolbar: { enabled: false }` is required in `examples/astro-blog/astro.config.mjs`
  for headless verification to work at all in this sandboxed dev environment** — Astro's
  dev toolbar entrypoint request (`/@id/astro/runtime/client/dev-toolbar/entrypoint.js`)
  never resolves here (confirmed via a request-timing probe: every other asset returned
  200, only this one hung indefinitely), which hangs any `waitUntil: "load"` Playwright
  navigation forever. Also had to launch Chromium with `--no-sandbox` and reach the dev
  server via a Bash call with `dangerouslyDisableSandbox: true` (matching the dev server's
  own launch context) — plain sandboxed Bash calls could not reach the loopback dev
  server at all. Unclear whether `devToolbar: false` is something Daniel would want kept
  for the *real*, non-sandboxed example (dev toolbar is a normal, often-wanted DX feature)
  — worth revisiting before M6; I left it off because the example's own verification
  script depends on it being off.
- **`client:visible` deferral verified for real, in headless Chromium, against the actual
  Astro dev server and the actual production `astro build` output** — not simulated.
  `examples/astro-blog/scripts/verify-client-visible.mjs`: loads the blog post, confirms
  zero requests referencing `packages/element` and zero rendered `<canvas>` elements
  before scrolling, scrolls the `<comic-strip>` into view, confirms the module loads and
  exactly 3 canvases render (matching the hand-written 3-panel document) after. `astro
  build` also verified clean (2 pages built; only the expected, harmless Node-import
  externalization *warnings* from `integration.ts`, no errors) — the initial version of
  `addRenderer`'s entrypoints used `new URL(...).href` (raw file:// paths), which built
  fine in dev but broke `astro build`'s static-output "built path" lookup; switched to
  bare `@toonstrip/astro/dist/renderer/*.js` specifiers so Vite can trace them through
  its normal module graph in both modes.
- **The hand-written `examples/astro-blog/src/content/tldr-strip.json` strip** (Dan and
  Anna, 3 panels, about embedding toonstrip itself) was authored directly by me, not
  generated by any AI/LLM call, per the dev plan's §0 non-goal — no such dependency was
  added anywhere in `examples/astro-blog`. Emotion angles were picked from
  `packages/core/src/emotion.ts`'s named `EMOTION_ANGLES` table (HAPPY, SCARED, LAUGH)
  rather than arbitrary numbers, and the whole document was validated against
  `@toonstrip/schema`'s `validateDocument` before wiring it into the page.
- **`examples/astro-blog` has no `test` script** (it's an app, not a library — `astro
  build` stands in as its "does this actually work" check, run via the `build` script;
  `pnpm -r run test` from root already skips packages missing the script without
  failing, confirmed by running it). The real end-to-end proof
  (`verify-client-visible.mjs`) is a manual/CI-optional script, same pattern M3 already
  established for `packages/element`'s `verify:demo` — neither is wired into `ci.yml`
  yet; that's still open (see the M3 note above about deciding on a Playwright-in-CI
  step before M6).
