# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.1**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M5 done; all 7 `@toonstrip/*` packages
published to npm at 0.1.0. Only the toonstrip.danielkimdev.com deploy remains to close
M6. Full history in `WORKLOG.md`.

---

## Last Session

M6 (partial): published all 7 `@toonstrip/*` packages to npm at 0.1.0 (public, scoped).
Added `publishConfig.access: public` to each package.json (required for a scoped
package's first publish). Fixed a Windows-only test path bug in `packages/cli` along the
way. Publish needed a granular npm access token with "bypass 2FA" enabled — the prior
token lacked it and `--otp` doesn't help with token-based auth.

---

## Next Actions

1. Deploy `examples/astro-blog` to **toonstrip.danielkimdev.com** — last piece of M6's
   exit criteria (§"M6" in `TOONSTRIP_DEV_PLAN.md`).
2. Verify `npm install @toonstrip/core` (etc.) works from a clean machine per the
   README's copy-paste example.
3. Read `NOTES.md` in full — judgment calls from M1–M5 made without a human in the loop
   are logged there.

---

## Open Issues

- toonstrip.danielkimdev.com not yet deployed — blocks closing M6.
- `@toonstrip/schema`'s ajv dependency has no ESM/browser build (`NOTES.md` "M3").
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face — a pack can pass validation and still render nothing (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet.
- See `NOTES.md` for everything else flagged across M1–M5.
