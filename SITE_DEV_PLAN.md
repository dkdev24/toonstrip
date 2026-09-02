# toonstrip.danielkimdev.com — Site Dev Plan (M7)

Development plan for the public site of the `toonstrip` package: introduction, docs,
changelog, and an interactive playground. This is the "properly designed" site that
`TOONSTRIP_DEV_PLAN.md` §7 and §10 defer to M7. The visual/UX rules live in a companion
document, `DESIGN.md` — this plan says *what to build and in what order*; `DESIGN.md`
says *what it should look and feel like*. Read both before starting any site phase.

Resolved at kickoff (2026-09-02): Astro (the only framework the package supports as of
`@toonstrip/astro` 0.1.10); Cloudflare Pages for hosting, Pages Functions (Workers
runtime) only where a feature genuinely needs a server (§9); a purpose-built `site/`
workspace package rather than growing `examples/astro-blog` (§2); no AI features
anywhere on the site (§0).

## 0. Mission and non-goals

The site has one job: get a developer from "what is this?" to a strip rendering in their
own Astro project, in one sitting, without installing anything first. Four surfaces serve
that job, in visitor order:

1. **Intro page** (`/`) — what toonstrip is, what it looks like, what it's for, and the
   30-second install. The hero *is* a live `<ComicStrip>`, not a screenshot.
2. **Docs** (`/docs/*`) — install, embed, author a document, reference. Every concept is
   shown as *code next to the rendered strip it produces*, from one shared source file.
3. **Playground** (`/playground`) — edit a `ComicStripDocument` three ways (form, JSON,
   and by watching the result), share it by URL, copy it out as Astro/JSON.
4. **Changelog** (`/changelog`) — public, per-release, human-written notes, rendered from
   a `CHANGELOG.md` the npm packages will also ship (§7).

Non-goals (inherit the library's §0, plus site-specific ones):

- **No AI anywhere on the site.** No "generate a strip from text", no LLM-assisted
  playground, no summarizer demo. The playground is an editor for data the visitor
  writes. A "how you might feed toonstrip from an LLM" *article* is fine as prose in
  docs; a button that does it is not.
- No accounts, no saved-strip gallery, no comments. Sharing is a URL (§6.5); nothing
  server-side stores a visitor's strip unless the optional short-link function lands
  (§9), and even then it stores only what the visitor explicitly asked to share.
- No blog. Announcements are changelog entries; longer writing goes on
  `danielkimdev.com`, which already embeds toonstrip.
- Not a Comic Chat museum. Nominative credit to Microsoft Comic Chat art (per
  `NOTICE`/`THIRD_PARTY.md`) belongs in the footer, the packs doc, and the FAQ; the site
  is named and branded `toonstrip` throughout (dev plan §12).

## 1. Current state this plan builds on

Verified against the repo on 2026-09-02:

- All seven `@toonstrip/*` packages are published (`schema` 0.1.3, `core` 0.1.6,
  `element` 0.1.7, `astro` 0.1.10, `cli`/packs 0.1.1). M0–M6 complete.
- The public API the site documents: `toonstrip({ packs })` Astro integration,
  `<ComicStrip document packs client:visible />`, the `<comic-strip>` element with a
  `document` property, a `packs` (base-URL list) property and a `src` attribute, and
  `validateDocument` from `@toonstrip/schema` (see `docs/astro.md`, `docs/schema.md`).
- Rendering inputs the playground must expose: per panel `backdrop`, `camera` (6
  presets), `roomTitle`, `dark`; per body `character`, `emotion {angle, intensity}`,
  `pose` (`wave`/`point`/`shrug`), `requested`; per line `speaker`, `balloon`
  (`speech`/`thought`/`caption`), `text`. The emotion wheel has 8 named angles
  (`HAPPY`…`LAUGH`, `packages/core/src/emotion.ts`) plus `NEUTRAL` at intensity 0.
- Two packs to showcase: `comic-chat` (15 characters, 3 backdrops, ~1.9 MB of PNG) and
  `example` (1 character `pip`, 1 backdrop `meadow`). The element fetches only the
  characters a document references, so pack weight is not a page-weight problem.
- `examples/astro-blog` is the existing integration test (Astro 7.x, `devToolbar`
  disabled, Playwright `client:visible` verification). It stays a minimal example.
- No public changelog exists. `WORKLOG.md` has 18 versioned entries but is internal,
  agent-oriented, and far too verbose to publish as-is.
- `toonstrip render` (static PNG, dev plan §8) does **not** exist yet. The site wants it
  for OG images (§8), so §10 sequences it as an optional sub-milestone.
- Sibling sites: both are Cloudflare Pages projects connected to their GitHub repos
  (push to `main` deploys; other branches get previews). `danielkimdev-astro` is
  `output: 'static'` with a `wrangler.toml` holding only `name`, `compatibility_date`,
  `pages_build_output_dir` (its `deploy` npm script is a manual fallback, not the
  normal path). `grues-in-comic` adds a `functions/` directory with a D1 binding and
  documents that the build command lives in the dashboard. Match this pattern (§9).

## 2. Where the site lives

A new workspace package at `site/` (package name `toonstrip-site`, `private: true`).

- **Not** `examples/astro-blog`. That example's value is being small enough to read in
  one screen and copy wholesale; a playground and a docs system would bury the thing it
  exists to demonstrate. It stays as the M4 integration test.
- `site/` depends on `@toonstrip/astro`, `@toonstrip/schema`, `@toonstrip/element`,
  `@toonstrip/core` (playground-only, for emotion names and `UNIT`), and both packs, all
  as `workspace:*`. The site therefore always dogfoods `main`, not the last npm release.
  The intro page reads the version it displays from `packages/core/package.json` at
  build time so the badge never drifts from what's deployed.
- Root `pnpm build` keeps building `site/` (it is `pnpm -r`); root `pnpm test` runs the
  site's Playwright suite only when `SITE_E2E=1` so library CI stays fast.

```
site/
  astro.config.mjs          # static output, toonstrip({ packs: [both packs] }), fonts, sitemap
  package.json              # dev / build / preview / test:e2e (no deploy script: push deploys, §9)
  src/
    layouts/    Base.astro, Docs.astro
    components/
      site/       Header, Footer, ThemeToggle, VersionBadge, Callout, CodeBlock, WidthSlider
      demo/       CodeAndStrip.astro   # docs' "JSON on the left, live strip on the right"
      playground/                      # the island (§6): editor, form, preview, share
    content/
      docs/       *.mdx                # content collection, ordered by frontmatter `order`
      strips/     *.json               # every strip shown in docs/landing; single source
    data/         changelog.ts         # build-time loader for ../../CHANGELOG.md
    lib/          share.ts             # URL-hash encode/decode, shared by docs + playground
    pages/        index.astro, docs/[...slug].astro, playground.astro, changelog.astro,
                  changelog.xml.ts, 404.astro, llms.txt.ts, llms-full.txt.ts
    styles/       tokens.css, global.css   # per DESIGN.md
  tests/          e2e/*.spec.ts        # Playwright
  public/         favicon set, robots.txt, _headers
wrangler.toml     # at the REPO ROOT: name = "toonstrip", pages_build_output_dir = "site/dist"
```

## 3. Stack decisions

| Decision | Choice | Why (and what was rejected) |
|---|---|---|
| Framework | Astro 7, `output: 'static'` | The package only ships an Astro wrapper; static matches both sibling sites. No SSR adapter — nothing on the site needs a server per request. |
| Docs system | Hand-built layout + MDX content collection | Starlight considered and rejected: it brings its own theme and shell that `DESIGN.md` would have to fight, and the site has ~12 doc pages. Sidebar, prev/next, and ToC are a day's work. Revisit only if docs exceed ~25 pages. |
| Search | Pagefind (build-time index), S6, only if warranted | Zero runtime cost, no service. Not needed at launch. |
| Code highlighting | Astro's built-in Shiki, dual `github-light`/`github-dark` themes, the same `data-language` transformer as `danielkimdev-astro` | Proven in the sibling repo; no runtime JS. |
| Playground UI | One Preact island (`client:load`, `/playground` only) with `@preact/signals` | Real interactive state (three views of one document). Preact is ~4 KB with an official Astro integration; signals make "one document, three views" trivial. Vanilla rejected as too much hand-wiring for form ↔ JSON sync; React rejected on size for a single page. |
| Code editor | CodeMirror 6 (`@codemirror/lang-json`, lint gutter) | Monaco rejected: web-worker setup, ~2 MB, poor on mobile. CodeMirror is ~300 KB, mobile-usable, and its lint API takes `validateDocument`'s ajv issues directly (they carry instance paths). |
| Preview | The real `<comic-strip>` element with `document`/`packs` set as properties | The playground proves the shipping component; it must not use a private renderer path. |
| Share links | Document compressed into the URL hash (`lz-string` `compressToEncodedURIComponent`) | No backend, works on any host, nothing stored. Short links are the *only* reason to add a Pages Function (§9), and they are optional. |
| Fonts | Astro `fonts` API (Google provider), families per `DESIGN.md` §3 | Same mechanism as the sibling site; self-hosted at build. |
| Analytics | Cloudflare Web Analytics beacon, cookie-less | Matches the platform; no consent banner needed. |
| Hosting | Cloudflare Pages via GitHub integration (push to `main` deploys, other branches preview), custom domain `toonstrip.danielkimdev.com` | Identical to how `danielkimdev.com` and `grues.danielkimdev.com` deploy. §9. |

## 4. Intro page (`/`)

Sections, top to bottom. Final copy is written by the author in their own voice; this
lists what each section must *do*.

1. **Hero.** One-line pitch (working line: "Comic strips from data, drawn live on your
   page") and a real `<ComicStrip client:load>` (above the fold, so `load` not
   `visible`) showing a 3-panel strip that explains toonstrip in its own dialogue. Two
   CTAs: *Open the playground* and *Read the docs*. Version badge from
   `@toonstrip/core`. A `WidthSlider` under the hero strip lets the visitor watch the
   responsive column policy (`layoutStrip`, max 3 columns) reflow live. This is the
   single most convincing demo of "not a flat image"; make it the first interaction on
   the page.
2. **The 30-second install.** Three copyable blocks: the install command (pnpm/npm/yarn
   tabs), `astro.config.mjs`, the `<ComicStrip>` tag. Below it, the *exact* strip that
   snippet produces, rendered.
3. **How it works.** Three cards: *You write data* (the JSON), *A pack supplies the
   art* (character thumbnails from both packs), *It renders live* (canvas, DPR-aware,
   reflows, accessible). Each card's illustration is a rendered strip or sprite, not an
   icon.
4. **Use cases.** Six short cards, each with a real rendered strip authored for it:
   a TL;DR strip at the top of a long post; a dialogue-style tutorial or FAQ; release
   notes as a strip; a two-character "objection and answer" explainer; replaying a chat
   or interview transcript; CMS-driven strips (the JSON can come from anywhere). The
   last card carries the "produce the data however you like, including with an LLM you
   call yourself" message as text, with no demo.
5. **Bring your own characters.** The `example` pack's `pip` next to the Comic Chat
   roster, linking to the packs doc. Puts the pack contract on the landing page so
   early contributors find it.
6. **Why not an image?** A short comparison (pre-rendered PNG, SVG export, toonstrip)
   on responsiveness, accessibility (`role="img"` + generated `aria-label`), page
   weight, editability.
7. **Footer.** MIT, GitHub, npm, the Comic Chat attribution line linking to `NOTICE`,
   link to `danielkimdev.com`.

Exit criteria: Lighthouse ≥ 95 on performance, accessibility, best practices, and SEO on
mobile; the hero strip paints in under 1 s on a throttled 4G profile (only the referenced
characters and one backdrop are fetched).

## 5. Docs (`/docs/*`)

### 5.1 Pages

| Slug | Content | Draws on |
|---|---|---|
| `getting-started` | Install, `astro.config.mjs`, first `<ComicStrip>`, what `client:visible` does and why | `docs/astro.md` |
| `writing-a-strip` | The `ComicStripDocument` walkthrough: panels → bodies → lines, built up over four live examples | `docs/schema.md`, `examples/astro-blog/src/content/tldr-strip.json` |
| `emotions-and-poses` | The emotion wheel, visually: one character rendered at each of the 8 named angles × 3 intensities, plus the 3 gestures | `packages/core/src/emotion.ts`, `pose.ts` |
| `cameras-and-panels` | The 6 camera presets rendered side by side on one scene; `roomTitle`, `dark`, `requested` | `render.ts` `SHOTS` |
| `balloons` | speech/thought/caption, multiple speakers, long text wrapping, what layout does when a balloon can't fit | `balloon-layout.ts`, the v0.7.9–0.7.11 lessons |
| `responsive-layout` | Column policy, `UNIT`, min scale; an embedded `WidthSlider` demo | `layout.ts` |
| `asset-packs` | Using both packs, the pack contract, adding a character, `toonstrip pack validate` | `docs/packs.md`, `CONTRIBUTING.md` |
| `plain-html` | `<comic-strip>` without Astro: script tag, `src` attribute vs `document` property | `packages/element` |
| `astro-reference` | Every option of the integration and component; limitations | `docs/astro.md` |
| `schema-reference` | Generated from `packages/schema/src/schema.json` at build time: field, type, required, description. Never hand-maintained. | `schema.json` |
| `accessibility` | What the element emits, how to write line text that reads well aloud, `describePanel` | `packages/element/src/describe.ts` |
| `faq` | No AI, no game engine, license and trademark, browser support, SSR/noscript | dev plan §0, §12 |

### 5.2 The "code and result" pattern

Every example in docs is one JSON file under `src/content/strips/`, rendered by one
component, `CodeAndStrip`, which (a) imports the JSON, (b) shows it through Shiki with a
copy button, (c) passes the same object to `<ComicStrip client:visible>`, and (d) links
"Open in playground" with the document pre-loaded into the URL hash (§6.5). The code
shown and the strip shown cannot disagree, and every docs example is one click from being
edited. Long JSON collapses to the first panel with an "expand" toggle.

### 5.3 Rules

- Docs pages are MDX with frontmatter `title`, `description`, `order`, `section`.
  Sidebar and prev/next derive from that; nothing is listed twice by hand.
- The repo's existing `docs/*.md` stay the canonical Markdown for GitHub readers. The
  site's MDX may reuse their prose but is allowed to be more visual; do not render
  `docs/*.md` directly, the audiences differ.
- Every page ends with prev/next and an "Edit this page on GitHub" link.
- Emit `/llms.txt` and `/llms-full.txt` (all docs concatenated as Markdown) so agents
  integrating toonstrip can read the docs without scraping HTML.

Exit criteria: a fresh agent session or outside developer, given only the site URL, can
embed a strip in a new Astro project and author a two-speaker document from
`writing-a-strip` alone (M5's exit criterion, re-run against the site).

## 6. Playground (`/playground`)

### 6.1 Layout

Three panes, one document. Desktop: a left column split vertically into **Form** (top)
and **JSON** (bottom, collapsible), and a right column holding **Preview** with a
toolbar. Below ~900 px: tabs *Form / JSON / Preview*, with the preview available as a
bottom sheet while editing. `DESIGN.md` §6 has the visual spec.

### 6.2 State model

- Single source of truth: `doc: Signal<ComicStripDocument>` plus
  `packs: Signal<string[]>` (pack names, default `["comic-chat"]`; the `example` pack is
  a toggle).
- Form edits write typed values straight into `doc`. JSON editor edits are parsed on a
  150 ms debounce and run through `validateDocument`; on success they replace `doc`, on
  failure the editor shows ajv issues inline (lint gutter, instance path mapped to a
  line) and `doc` keeps its last valid value, so the preview never goes blank.
- `doc` → JSON text is regenerated only when the change originated from the form (a
  `source` flag stops the editor reformatting under the visitor's cursor).
- Preview sets `element.document = doc.value` and `element.packs = resolvedUrls` on
  every change; the element already coalesces via its build token.
- Undo/redo: a bounded history (50) of `doc` snapshots; `Ctrl/Cmd+Z`,
  `Shift+Ctrl/Cmd+Z`.

### 6.3 Form (WYSIWYG configuration)

- **Panels** list: add, remove, reorder (drag handle plus move buttons for keyboard),
  duplicate. The selected panel is outlined in the preview by the playground, not by
  the element.
- **Per panel**: backdrop picker (thumbnails from the registered packs), camera (6
  presets as a segmented control with small illustrative glyphs), room title text,
  dark toggle.
- **Bodies**: add from a character picker (thumbnail grid across registered packs,
  labelled with the pack name), remove, reorder left-to-right. Per body an **emotion
  wheel**: a radial control where angle is the position around the wheel (labelled with
  the 8 names) and intensity is distance from centre; dragging updates the preview
  live, and the numeric `angle`/`intensity` are shown and editable beside it. Pose:
  none / wave / point / shrug. `requested` toggle, shown only when the body has no line.
- **Lines**: per panel, add a line choosing speaker (the panel's bodies plus
  *caption*), balloon type (forced to caption when the speaker is caption), text.
  Reorder.
- Constraints are enforced in the form, not just reported: a line's speaker must be a
  body in that panel or `caption`; removing a body offers to remove or reassign its
  lines.

### 6.4 Preview toolbar

- **Width control**: a slider (260–1240 px) plus presets *phone / tablet / desktop /
  fill*, showing the current column count. Reflow is the product's core claim, so this
  control is always visible.
- **Surface theme**: light/dark preview background, to check how a strip sits on a
  dark page.
- **Zoom to panel**: click a panel to see it at native `UNIT` size.
- **Export**: *Download PNG* (composites the element's canvases into one image
  client-side at the current width, DPR 2, white background with a transparent
  option), *Copy JSON*, *Copy Astro snippet* (the `<ComicStrip>` tag plus the JSON
  import), *Copy HTML snippet* (the plain `<comic-strip>` form).

### 6.5 Sharing and presets

- **Share** compresses the document into `#d=<lz-string>` and, if non-default, `&p=`
  pack names. Loading a URL with a hash restores it; an invalid or oversized hash falls
  back to the default preset with a toast. Hash, not query string, so the document is
  never sent to the server or to analytics.
- **Presets** dropdown: the hero strip, each use-case strip from the landing page, the
  emotion gallery, and a "kitchen sink" that uses every feature. All are the same JSON
  files the docs use.
- **Reset** returns to the first preset.
- Autosave the last document to `localStorage` (guarded; ignore failures) so a reload
  doesn't lose work. Nothing leaves the browser.

### 6.6 What the playground must not do

No AI text generation, no "suggest an emotion from the text", no server-side render. A
visitor who wants their strip as an image gets the client-side PNG export from the same
canvases they are looking at.

Exit criteria: a visitor with no prior knowledge can, in the form alone, build a 2-panel,
2-character strip with a caption and a thought balloon, then copy an Astro snippet that
renders identically in `examples/astro-blog`. The form → JSON → form round trip is
lossless (Playwright test). Playground JS ≤ 450 KB gzipped including CodeMirror and
Preact; the rest of the site ships no framework JS.

## 7. Changelog (`/changelog`)

- Create a root `CHANGELOG.md` in Keep a Changelog form: one `## x.y.z — YYYY-MM-DD`
  entry per repo version, `### Added / Changed / Fixed` subsections, and a *Packages*
  line listing the npm versions that shipped (versions are not lockstep, so this line
  is what a reader actually needs). Backfill from `WORKLOG.md`'s 18 entries at S5,
  written for users, three to eight lines each, linking to the worklog entry for the
  full story.
- The site parses `CHANGELOG.md` at build time (`src/data/changelog.ts`, a small
  heading walker over the file read from the repo root) and renders it with an anchor
  per version and an Atom feed at `/changelog.xml`.
- From S5 onward the release procedure gains a step: add a `CHANGELOG.md` entry
  *before* `pnpm publish`. `WORKLOG.md` remains the internal, agent-facing history;
  `CHANGELOG.md` is the public one. They are different documents and are not generated
  from each other.
- An entry whose change is visible (a balloon fix, a new camera) may embed a
  `CodeAndStrip` before/after where it earns the space; the default entry is text.

## 8. Cross-cutting requirements

- **Accessibility**: WCAG 2.2 AA. Every playground control is keyboard-operable,
  including reorder and the emotion wheel (arrow keys step angle/intensity, values
  announced). Strips rely on the element's own `role="img"`/`aria-label`. Respect
  `prefers-reduced-motion`. axe passes in CI.
- **Theme**: light and dark via `data-theme` on `<html>` with system default, the same
  mechanism as `danielkimdev.com`; preference stored in `localStorage`.
- **Performance budget**: intro page ≤ 60 KB JS gzipped (element + hero JSON + theme
  toggle + width slider), docs pages ≤ 40 KB, playground per §6. Fonts self-hosted, two
  families preloaded. Rendered strips are canvases, so the only image weight is pack
  PNGs, which the element fetches lazily.
- **SEO/meta**: `site` set for canonical URLs, sitemap, OG/Twitter meta per page. OG
  images: one designed static image at launch; per-page OG images rendered from each
  page's first strip once `toonstrip render` exists (S7).
- **Robustness**: root `pnpm build` on a clean checkout builds the packages and then
  the site, which is exactly what the Pages build runs; CI proves it on every push.
- **Privacy**: no cookies, no third-party scripts beyond the Cloudflare beacon.

## 9. Deployment (Cloudflare Pages)

Match `danielkimdev-astro` exactly unless a reason is written down here.

- **Deploy = push.** The Pages project `toonstrip` is connected to the GitHub repo
  through Cloudflare's Git integration, the same way the other two sites are: a push
  to `main` builds and deploys production; a push to any other branch builds a preview
  at `<branch>.toonstrip.pages.dev`. No `wrangler pages deploy` script, no GitHub
  Actions deploy job, no API tokens in the repo. The repo's own CI (`ci.yml`) keeps
  running tests and a site build as a check, but Cloudflare does the deploying.
- **Monorepo settings in the Pages dashboard** (the build command is dashboard-only;
  `wrangler.toml` cannot express it, per `grues-in-comic`'s note):
  - Root directory: repo root (`/`), so pnpm sees the workspace.
  - Build command: `pnpm build` (`pnpm -r run build` builds the packages before
    `site/` in workspace order, so the site always builds against the checked-in
    library source).
  - Build output directory: `site/dist`.
  - Package manager: add `"packageManager": "pnpm@10.x"` to the root `package.json`;
    Pages honours it. Node: `.node-version` at the root with `20` (matches `ci.yml`).
  - Build watch paths (include): `site/**`, `packages/**`, `CHANGELOG.md`,
    `pnpm-lock.yaml`, so a docs-only or worklog-only commit does not trigger a build.
  - Environment: `SITE_E2E` unset (Playwright does not run in the Pages build).
- **`wrangler.toml` at the repo root**, not in `site/`, because the Git integration
  reads it from the project root directory: `name = "toonstrip"`,
  `compatibility_date` set to the date of S0, `pages_build_output_dir = "site/dist"`.
  Once this file exists Pages takes output dir and bindings from it and ignores the
  dashboard's equivalents, so the two must agree (same pitfall `grues-in-comic`
  documents).
- **Custom domain** `toonstrip.danielkimdev.com` (a CNAME in the `danielkimdev.com`
  zone, already on Cloudflare). The `toonstrip.pages.dev` URL and branch previews
  exist from S0; the custom domain is attached only at S8, honouring the dev plan's
  "deploy at the end of M7" rule while still letting every phase be checked on real
  hosting.
- Local check before pushing: `pnpm build && pnpm --filter toonstrip-site preview`.
  `wrangler pages dev site/dist` only becomes relevant if a Pages Function is added.
- **Workers**: nothing at launch needs one. The single candidate is a short-link service
  for shared playground URLs (`functions/api/share.ts` plus a KV namespace: `POST`
  stores a compressed doc under an 8-char id, `GET /s/:id` redirects to the hash form).
  Build it only if shared URLs prove too long for where people paste them. If built, it
  follows `grues-in-comic`'s `functions/` pattern with the KV binding in
  `wrangler.toml`, rate-limited, size-capped at 16 KB, storing nothing else. Cloudflare
  now steers new projects toward Workers static assets rather than Pages; stay on Pages
  for parity with the other two sites and revisit only if Pages loses a feature the
  site needs.
- Headers: `public/_headers` with `Cache-Control: public, max-age=31536000, immutable`
  for `/_astro/*`, and a CSP allowing `'self'` plus the analytics beacon.
  `@toonstrip/schema` 0.1.3+ runs without `unsafe-eval`, so the CSP can omit it. Pack
  assets under `/_toonstrip/*` are copied to a version-less path by the integration;
  give them a shorter max-age (1 day) until that path carries the pack version.

## 10. Phases and exit criteria

Each phase ends with the site building, deploying to the `pages.dev` preview, and a
`WORKLOG.md` entry. Versions continue the repo's `0.x` line (site work is `0.8.x`).

| # | Scope | Exit criteria |
|---|---|---|
| S0 | Scaffold `site/`, Astro static config, integration wired with both packs, root `wrangler.toml`, `packageManager`/`.node-version`, Pages project `toonstrip` connected to the GitHub repo with the §9 dashboard settings, CI builds the site, placeholder pages for all four surfaces, `DESIGN.md` tokens landed as `tokens.css`. | Pushing to `main` puts a placeholder on `toonstrip.pages.dev` with no manual step; a feature branch push produces a preview URL; CI green. |
| S1 | Shell: `Base` layout, header/nav, footer, theme toggle, fonts, `CodeBlock`, `Callout`, `CodeAndStrip`, `WidthSlider`, `share.ts`, 404. | Every `DESIGN.md` §5 component exists on a `/_kitchen-sink` page (excluded from the sitemap) and passes axe. |
| S2 | Intro page (§4), including the hero strip and six use-case strips authored by hand. | §4 exit criteria; Lighthouse mobile ≥ 95 across the board. |
| S3 | Docs (§5): layout, sidebar, ToC, all 12 pages, generated schema reference, `llms.txt`. | §5 exit criteria; every docs strip's "open in playground" link lands the correct hash. |
| S4 | Playground (§6): Preact island, form, CodeMirror, preview and toolbar, share, presets, export, autosave, undo. | §6 exit criteria; Playwright covers round-trip, share-link restore, non-blank PNG export, and keyboard-only authoring of a 2-panel strip. |
| S5 | Changelog (§7): `CHANGELOG.md` backfilled, loader, page, feed; release procedure docs updated. | `/changelog` lists every version in `WORKLOG.md`; adding an entry and rebuilding shows it; the feed validates. |
| S6 | Polish: a11y audit across pages, reduced motion, performance budgets enforced by a size-check script in CI, static OG image, sitemap/robots, Pagefind if warranted, final copy pass in the author's voice. | Budgets pass in CI; axe reports zero violations; copy reviewed by the author. |
| S7 (optional) | `toonstrip render` in `@toonstrip/cli` (dev plan §8) via `@napi-rs/canvas`; per-page OG images built from each page's first strip; `<noscript>` fallback image in `CodeAndStrip`. | `toonstrip render doc.json --out strip.png` works; OG images generated at build. Skip if it threatens S8; it is not on the launch path. |
| S8 | Launch: attach `toonstrip.danielkimdev.com`, enable analytics, README and npm READMEs link to the site, `danielkimdev.com` links across, `HANDOFF.md` records the URL and deploy procedure. | The dev plan's M7 exit criterion verbatim: subdomain live, presents the project, a visitor can try the component in the playground without installing anything. |

Sequence S0→S1→S2 strictly. S3 and S4 can proceed in parallel after S1; they share only
the hash format in `src/lib/share.ts`, which S1 fixes so both sides build against it. S5
is independent and small. S6 follows S2–S5. S7 is optional and may run any time after S1.
S8 is last.

## 11. Testing

- **Unit** (Vitest, in `site/`): share-hash encode/decode, changelog parser,
  schema-reference generator, form ↔ document reducers.
- **E2E** (Playwright, `site/tests/e2e`): one smoke test per surface; the playground
  scenarios from S4; theme toggle persists; `client:visible` still defers on docs pages
  (reuse the approach in `examples/astro-blog/scripts/verify-client-visible.mjs`).
- **Budgets**: a script that fails CI when any route's gzipped JS exceeds §8.
- **Accessibility**: `@axe-core/playwright` on every route in the sitemap.
- Playwright works on this Windows machine for the site (DOM-level checks). The
  macOS-only font-rasterization gates that block the `grues-in-comic` port do not apply
  here. Pixel-level checks of rendered strips remain the library's job, not the site's.

## 12. Risks and open questions

- **Pack asset caching vs versions** (§9): the integration copies packs to a
  version-less path. Fine at launch; revisit if a pack update ships while old HTML is
  still cached.
- **PNG export**: compositing several canvases is straightforward, but the exporter
  draws the gutters and background itself. Decided: white background by default,
  transparent as an option.
- **Emotion wheel semantics**: `NEUTRAL` shares `HAPPY`'s angle at intensity 0, and the
  gestures are sentinels above 2π, not wheel positions. The wheel control must present
  intensity 0 as "neutral" regardless of angle and keep pose as a separate control, or
  visitors will produce documents that look wrong for reasons the UI hid.
- **Docs prose ownership**: the author writes final copy; agents draft. Budget the
  author's review time in S2 and S6 explicitly.
- **Short links** (§9): decide after launch from real sharing behaviour.
- **`workspace:*` vs published versions**: the site dogfoods `main` and the version
  badge is honest about it. If a docs example ever depends on an unpublished fix, hold
  the site deploy until the publish rather than pinning the site to npm.
