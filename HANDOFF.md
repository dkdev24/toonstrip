# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.0** (M14 `@toonstrip/asset-packager`, M15 sheet input; npm: schema 0.1.3, core
0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1, react/vue/next 0.1.0;
asset-packager 0.2.0 built, unpublished)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane
(Zork/game/AI-inference coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done.
10 `@toonstrip/*` packages on npm; an 11th (`asset-packager`) built/tested,
unpublished. Site live at **https://toonstrip.danielkimdev.com**.
**Deploy:** Cloudflare Pages `toonstrip`, GitHub integration; push to `main` deploys
prod (`wrangler.toml` output dir `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-03 (second session): **M14** — built `packages/asset-packager`
(`toonstrip-pack`): per-pose PNGs in, a valid pack out (validate, sheet-pack, join
anchors, `--preview`, `--npm`), plus `docs/asset-image-spec.md` + a `SKILL.md` prompt
section. **M15** — sheet input: one image, many assets, any declared grid shape.
`template` emits the reference sheet + `source.json` fragment + prompt; cells are
gutter-snapped, label-cropped, keyed (white ground is fine) and registered against
NEUTRAL so drift is corrected. Files override sheet cells. 33 tests, two fixtures,
`docs/asset-sheets.md`; both paths verified through `pack validate` + `render`.

## Next Actions

1. **Site docs page for the packager** (`site/src/content/docs/`, Reference, next to
   `agent-skill.mdx`) covering both input paths, then publish
   `@toonstrip/asset-packager` 0.2.0 to npm.
2. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — M8-M13 all done, so this is
   unblocked (per that plan: land English content once, not twice).
3. **Daniel:** copy pass in his voice over `index.astro`/`docs/*.mdx`; link the site
   from `danielkimdev.com`.
4. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9); a Nuxt wrapper.

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only);
  `toonstrip-pack validate` does catch it on the source side. Playwright verify scripts
  are manual-only (`NOTES.md` M1–M5).
- `renderPlaceholder` needs `@toonstrip/cli` as the consuming app's own direct dep (not
  just transitive via `next`) plus `serverExternalPackages` in `next.config` — see
  `docs/next.md` "Native dependency". Packaging papercut, not a bug.
