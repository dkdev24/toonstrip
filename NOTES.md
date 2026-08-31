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
