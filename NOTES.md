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
