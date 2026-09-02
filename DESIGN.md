# DESIGN.md — toonstrip.danielkimdev.com

UI/UX design guide for the toonstrip website. `SITE_DEV_PLAN.md` says what to build;
this document says how it should look, feel, and behave. Tokens in §2–§5 land verbatim
in `site/src/styles/tokens.css` at phase S0 and are the only source of colour, type,
spacing, and radius values in the site. If a value isn't here, add it here first.

## 1. Purpose and audience

- **Audience**: web developers, mostly Astro users, evaluating a small library. They
  skim, they want to see the thing work in the first five seconds, and they copy code.
  Secondary: designers and writers who might author strips in the playground without
  ever installing anything; contributors who want to add a character pack.
- **Job of the design**: make the *rendered strips* the hero on every page and keep the
  chrome around them quiet, precise, and fast. The product draws comics; the site does
  not need to look like one.
- **Relationship to `danielkimdev.com`**: a sibling, not a clone. Shared body typeface
  and the same light/dark mechanism so the two feel related; its own palette, display
  face, and voice so the project reads as a standalone open-source tool.

## 2. Visual theme

**"Newsprint and ink, with one yellow balloon."** Warm off-white paper, near-black ink,
a single saturated accent borrowed from a speech balloon, and clean editorial
typography. Comic-strip motifs appear as *structure* (panel borders, gutters, a caption
box) rather than decoration (no halftone splashes, no "POW!" lettering, no tilted
elements, and never Comic Sans in the UI; the strips carry the comic feel by
themselves).

Atmosphere in three words: **crisp, warm, editorial.** The reference points are a
well-set documentation site and a Sunday comics page, not a superhero poster.

### 2.1 Colour palette

Light is the default; dark is a full counterpart (§9), not an afterthought. Every pair
below is checked for WCAG 2.2 AA (≥ 4.5:1 body text, ≥ 3:1 large text and UI edges).

| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | `#FBF8F1` | `#161511` | Page background |
| `--paper-raised` | `#FFFFFF` | `#1E1D18` | Cards, code blocks, panes |
| `--paper-sunken` | `#F1ECE0` | `#0F0E0B` | Inset areas: editor gutter, table stripes, preview stage |
| `--ink` | `#1B1A17` | `#F2EEE3` | Primary text, panel borders, icons |
| `--ink-2` | `#4A4740` | `#C9C3B4` | Secondary text, labels |
| `--ink-3` | `#7A766C` | `#8E897B` | Muted text, placeholders (never for body copy) |
| `--rule` | `#DCD5C5` | `#322F27` | Borders, dividers, input outlines |
| `--rule-strong` | `#B9B09B` | `#4B473C` | Focused/hovered outlines, table header rule |
| `--accent` | `#F5C400` | `#FFD23F` | The balloon yellow: primary buttons, selection, highlight |
| `--accent-ink` | `#1B1A17` | `#1B1A17` | Text on accent (ink on yellow in both themes) |
| `--accent-soft` | `#FFF3B8` | `#3A3010` | Accent tint: selected list rows, active nav, marks |
| `--link` | `#1F4FD8` | `#8AB4FF` | Links and secondary interactive text |
| `--link-hover` | `#143AA8` | `#B3CBFF` | |
| `--success` | `#1E7F4F` | `#5FD39A` | Valid document, copy confirmation |
| `--warn` | `#B5540A` | `#F2A45C` | Non-fatal notices (fallback layout hit, pack toggle) |
| `--danger` | `#C1272D` | `#FF7B7B` | Validation errors, destructive buttons |
| `--danger-soft` | `#FBE3E3` | `#3B1A1A` | Error backgrounds |
| `--shadow` | `0 1px 2px rgb(27 26 23 / .06), 0 4px 16px rgb(27 26 23 / .08)` | `0 1px 2px rgb(0 0 0 / .5), 0 4px 20px rgb(0 0 0 / .45)` | Raised elements |

Rules:

- Yellow is *one* thing per viewport: a primary button, the active nav item, or a
  selection highlight. Never large yellow areas, never yellow text.
- Blue is only for links and link-like controls. Buttons are ink or yellow.
- Code syntax comes from Shiki's `github-light`/`github-dark`; do not re-tint it.
- Rendered strips keep their own colours; never apply CSS filters to a `<comic-strip>`.

## 3. Typography

| Token | Family | Fallback | Use |
|---|---|---|---|
| `--font-display` | Bricolage Grotesque (Google) | `system-ui, sans-serif` | Page titles, hero, section headings |
| `--font-body` | DM Sans (Google, shared with `danielkimdev.com`) | `system-ui, sans-serif` | Body, UI, nav, forms |
| `--font-mono` | JetBrains Mono (Google) | `ui-monospace, Menlo, monospace` | Code, JSON editor, version badge, numeric fields |

Loaded through Astro's `fonts` API, self-hosted at build; preload display and body only.
Weights: display 500/700; body 400/500/700; mono 400/500. No italic display. If Korean
pages are ever added, use Pretendard as on the parent site.

### 3.1 Scale (fluid, `clamp()`)

| Token | Size | Line height | Weight | Family |
|---|---|---|---|---|
| `--text-hero` | `clamp(2.5rem, 5.5vw, 4rem)` | 1.05 | 700 | display |
| `--text-h1` | `clamp(2rem, 4vw, 2.75rem)` | 1.1 | 700 | display |
| `--text-h2` | `clamp(1.5rem, 2.5vw, 1.875rem)` | 1.2 | 600 | display |
| `--text-h3` | `1.25rem` | 1.3 | 600 | display |
| `--text-lead` | `1.25rem` | 1.5 | 400 | body |
| `--text-body` | `1.0625rem` (17 px) | 1.6 | 400 | body |
| `--text-small` | `0.9375rem` | 1.5 | 400 | body |
| `--text-caption` | `0.8125rem` | 1.4 | 500 | body, uppercase tracking `0.04em` for labels |
| `--text-code` | `0.9em` of parent | 1.6 | 400 | mono |

Principles: measure 60–72 characters for prose (`max-width: 68ch`); headings tight and
left-aligned; no centred body text except in the hero; numerals in `tabular-nums` inside
tables, the playground, and the changelog.

## 4. Layout

- **Container**: `--container: 72rem` (1152 px) for the intro and changelog; docs use a
  three-column grid `15rem | minmax(0, 1fr) | 14rem` (sidebar, article, ToC) inside
  `--container-wide: 84rem`; the playground is full-bleed under the header.
- **Spacing scale** (`--space-*`): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px. Section
  padding on the intro page is `--space-96` desktop, `--space-64` mobile.
- **Gutters**: strips render with the element's own gutter; content around them keeps
  at least `--space-24` clearance so panel borders never touch other borders.
- **Radius** (`--radius-*`): `sm` 4 px (inputs, chips), `md` 8 px (cards, code
  blocks), `lg` 14 px (callouts, the preview stage), `pill` 999 px (badges, toggles).
  Panels inside strips are square-cornered by the renderer; do not round them with CSS.
- **Borders**: 1 px `--rule` by default; 2 px `--ink` is reserved for comic-structure
  elements (the `CodeAndStrip` frame, the caption-style callout, the hero frame).
- **Breakpoints**: `sm` 640, `md` 900, `lg` 1200 px. Docs collapse the ToC below `lg`
  and the sidebar below `md` (into a top disclosure). The playground switches to tabs
  below `md` (§6.3).
- **Elevation**: two levels only. Flat (borders) for almost everything; `--shadow` for
  the theme menu, toasts, the mobile preview sheet, and dragged list items.

## 5. Components

### 5.1 Header

Sticky, 56 px, `--paper` with a 1 px `--rule` bottom edge, blurred backdrop on scroll.
Left: wordmark `toonstrip` in display 700 with a 12 px square yellow "panel" glyph
before it. Centre/right: Docs, Playground, Changelog, GitHub icon, theme toggle. Active
item: `--accent-soft` pill. Mobile: the three text links stay visible (they fit); the
theme toggle and GitHub icon move into a "More" disclosure below 400 px.

### 5.2 Buttons

| Variant | Style | Use |
|---|---|---|
| Primary | `--accent` bg, `--accent-ink` text, no border, 500 weight | One per section: "Open the playground", "Copy" in the install block |
| Secondary | transparent bg, 1 px `--ink` border, `--ink` text | "Read the docs", toolbar actions |
| Ghost | no border, `--ink-2` text, `--paper-sunken` on hover | Icon buttons, list-item actions |
| Danger | `--danger-soft` bg, `--danger` text | Remove panel/body/line |

Height 40 px (36 px in dense playground toolbars), padding `0 16px`, radius `md`.
Focus ring: 2 px `--link` outline offset 2 px, on every interactive element without
exception. Hover darkens 6 %; no scale transforms.

### 5.3 Code block

`--paper-raised` bg, 1 px `--rule` border, radius `md`, `data-language` label top-right
in `--text-caption` `--ink-3`, copy button (ghost, shows "Copied" with `--success` for
1.5 s). Long lines wrap (Shiki `wrap: true`); the block never scrolls horizontally.
Package-manager tabs (pnpm/npm/yarn) sit inside the block header, remembered in
`localStorage`.

### 5.4 CodeAndStrip

The docs' signature block and the one comic-structured component. A 2 px `--ink`
frame, radius `md`, split into two cells with a 2 px ink divider (the "gutter"): JSON
on the left (or top below `md`), the live strip on the right on a `--paper-sunken`
stage. A `--text-caption` bar above the frame carries the example title, an "Open in
playground" link, and a "Show all N panels" toggle when the JSON is collapsed. Strip
first on mobile (it's the point), JSON second.

### 5.5 Callout

Four kinds: note (`--rule` border), tip (`--accent` left rule, `--accent-soft` bg),
warning (`--warn`), danger (`--danger`). The *note* kind is drawn as a comic caption
box (2 px ink border, square corners, small-caps label) because captions are how
comics deliver asides; the others are conventional rounded callouts. Icons are inline
SVG, 16 px, currentColor.

### 5.6 Cards (intro page)

`--paper-raised`, 1 px `--rule`, radius `md`, padding `--space-24`. Illustration area
top (a rendered strip or sprite on `--paper-sunken`), title `--text-h3`, one or two
sentences `--text-small` `--ink-2`. Hover lifts the border to `--rule-strong`; no
shadow, no movement.

### 5.7 Docs sidebar and ToC

Sidebar: section labels in `--text-caption` uppercase `--ink-3`; items `--text-small`;
active item `--accent-soft` bg with `--ink` text and a 2 px yellow left rule. ToC:
`--text-small` `--ink-2`, active heading `--ink` with a 2 px ink left rule, follows
scroll with `IntersectionObserver`. Prev/next at page foot as two secondary-button
sized cards.

### 5.8 Changelog entry

Version in mono 500 as an anchor (`#0.7.11`), date `--ink-3`, then the *Packages* line
as a row of `pill` badges (`core 0.1.6`), then Added/Changed/Fixed lists. Entries
separated by 1 px `--rule`; the newest expanded, the rest expanded too (no accordion:
people search the page with find-in-page).

### 5.9 Width slider

A range input styled with a `--rule` track and an ink thumb, a live readout
(`820 px · 2 columns`) in mono, and preset chips (phone/tablet/desktop/fill). The
resized strip sits on a `--paper-sunken` stage with a dashed `--rule-strong` outline
showing the container edge, so the visitor sees *why* it reflowed.

### 5.10 Toast

Bottom-centre, `--ink` bg with `--paper` text (inverted, so it reads on both themes),
radius `pill`, 3 s, `role="status"`. Used for copy confirmations and share-link
fallbacks only.

## 6. Playground

### 6.1 Structure

Full-bleed under the header. Desktop (`≥ md`): a 2-column grid `minmax(22rem, 2fr)
minmax(0, 3fr)` with a 1 px `--rule` divider. Left column: **Form** (top, scrolls) and
**JSON** (bottom, resizable via a drag handle, collapsible to a 36 px bar). Right
column: **Preview** with a 44 px toolbar pinned top. Below `md`: a segmented tab bar
*Form / JSON / Preview* under the header; from Form or JSON a persistent "Preview"
button opens the preview as a bottom sheet at 55 % height with `--shadow`.

### 6.2 Form

Dense but readable: label `--text-caption` above control, control height 36 px,
vertical rhythm `--space-12`. Panels are cards in a vertical list; the selected panel
has a 2 px `--ink` border (mirrored by an outline on the corresponding canvas in the
preview), others 1 px `--rule`. Inside a panel card, three groups with headings
*Scene* (backdrop, camera, title, dark), *Characters*, *Lines*. Add buttons are ghost
with a plus icon and a full-width dashed border so empty groups have an obvious target.

- **Backdrop picker**: a row of 64 × 54 thumbnails (real backdrop PNGs, `object-fit:
  cover`), selected one outlined in `--accent`.
- **Camera**: a 6-way segmented control; each segment shows a 20 px glyph (a frame
  with a figure at establishing → close-up scale) and the label on hover/focus.
- **Character picker**: a popover grid of 56 px thumbnails cropped from each sheet's
  neutral head (built once from the pack manifest), grouped by pack, with the id under
  each. Search box on top when more than 12 characters are registered.
- **Emotion wheel**: 120 px radial control. Eight labelled spokes (`HAPPY` at angle 0,
  then `COY`, `BORED`, `SCARED`, `SAD`, `ANGRY`, `SHOUT`, `LAUGH` at successive π/4
  steps, exactly the order in `packages/core/src/emotion.ts`), a dot for the current
  value, intensity as distance from centre with the inner 12 % rendered as a
  `NEUTRAL` zone. Dragging updates live; `angle`/`intensity` numeric fields in mono
  beside it accept typed values. Keyboard: ←/→ step angle by π/8, ↑/↓ step intensity by
  0.1, announced through `aria-valuetext` ("SAD, intensity 0.6"). Pose is a separate
  4-way segmented control under the wheel; never fold gestures into the wheel.
- **Lines**: speaker select (bodies + caption), balloon select, a 2-row auto-growing
  textarea, character count in `--ink-3`. Speaker `caption` disables the balloon
  select to `caption`.
- **Reorder**: a 6-dot drag handle at each list item's left edge plus ▲/▼ ghost
  buttons for keyboard users. Dragged items lift with `--shadow`.

### 6.3 JSON editor

CodeMirror themed with the site tokens (bg `--paper-raised`, gutter `--paper-sunken`,
selection `--accent-soft`, syntax colours from the Shiki `github-*` palettes so it
matches docs code). Lint markers in `--danger` with the ajv message on hover and a
list under the editor ("2 problems") that focuses the line on click. A `--success` dot
in the pane header when the document is valid. Header actions: Format, Copy, Collapse.

### 6.4 Preview

Toolbar (left to right): width slider with readout, presets, surface theme toggle,
zoom-to-panel toggle, then a right-aligned **Share** (secondary) and **Export** menu
(primary). Below it the stage: `--paper-sunken`, the strip centred in a container whose
width the slider controls, dashed `--rule-strong` outline marking that container. On
the dark-surface option the stage becomes `#0F0E0B` regardless of site theme so the
visitor can check a strip against a dark page. A thin status line under the stage:
column count, panel count, characters fetched, and a `--warn` notice if a balloon
hit the layout fallback.

### 6.5 Empty, loading, and error states

- First visit with no hash and no autosave loads the hero preset, never an empty form.
- While a pack fetch is in flight, the stage shows a skeleton of panel rectangles at
  the correct layout, not a spinner.
- Invalid JSON never blanks the preview; the last valid document stays, and the JSON
  pane header turns `--danger` with the problem count.
- An unresolvable character/backdrop id (valid JSON, unknown pack id) shows a
  `--danger-soft` banner above the stage naming the id and which packs are registered.

## 7. Motion

Minimal and functional. Durations: 120 ms for hover/focus colour, 200 ms for
disclosures, toasts, and the mobile sheet, easing `cubic-bezier(.2,.7,.2,1)`. Strips
reflowing on resize are not animated (the element re-renders instantly; do not fake a
transition over it). Under `prefers-reduced-motion: reduce`, every transition drops to
0 ms and the sheet appears in place. No parallax, no scroll-triggered reveals, no
looping animations anywhere.

## 8. Accessibility

- WCAG 2.2 AA is the floor; palette pairs in §2.1 are pre-checked, but re-run a
  contrast check whenever a token changes.
- Visible focus on everything (§5.2). Skip link to main content. Landmarks: `header`,
  `nav`, `main`, `aside` (docs sidebar/ToC), `footer`.
- Strips rely on `<comic-strip>`'s own `role="img"`/`aria-label`; the site adds a
  visually hidden caption (`figcaption`) with the example title in `CodeAndStrip`.
- Every playground control has a text label (visually hidden where the design shows
  an icon), keyboard operation per §6.2, and live-region announcements for validation
  state, copy, and export.
- Touch targets ≥ 44 × 44 px on mobile, including list reorder buttons.
- Colour is never the only signal: validity uses a dot *and* text; selected panel uses
  a thicker border *and* the label "Selected".

## 9. Dark mode

`data-theme="light" | "dark"` on `<html>`, defaulting to `prefers-color-scheme`,
toggled from the header, persisted in `localStorage`, applied by an inline script in
`<head>` before paint to avoid a flash. Every token in §2.1 has a dark value; the
implementation swaps tokens only, never adds `.dark` selectors on components. Shiki's
dual theme swaps with the same attribute. Rendered strips are unaffected by theme (the
canvas is the artwork); the preview's *surface* toggle (§6.4) is the only place a strip
sits on dark, and it is a stage choice, not a theme choice.

## 10. Imagery and comic motifs

- **Real strips are the imagery.** Hero, cards, docs examples, OG image: all rendered
  from JSON in `site/src/content/strips/`. No stock illustration, no icon sets beyond
  the 16 px functional inline SVGs.
- Comic structure is allowed in exactly three places: the `CodeAndStrip` frame and
  gutter (§5.4), the caption-style *note* callout (§5.5), and the 12 px panel glyph in
  the wordmark (§5.1). Anywhere else, use ordinary rules and cards.
- Character sprites from the packs may appear as thumbnails (character picker, pack
  cards) at their native pixel grid, `image-rendering: auto`, never upscaled beyond 2×.
- Favicon: the yellow panel glyph with an ink border. OG image: the hero strip on
  `--paper` with the wordmark.

## 11. Voice and copy

Plain, direct, second person, present tense. Sentences under 20 words in UI text. Say
what the thing does, not how clever it is ("Renders on a canvas, reflows when the
container changes width." not "Blazing-fast, pixel-perfect rendering!"). Label buttons
with verbs ("Copy JSON", "Open in playground"). Error messages name the field and the
fix ("`panels[1].speakers[0].speaker` must be a character in this panel, or
`caption`."). The author writes final copy; drafts follow these rules so the pass is
light.

## 12. Do and don't

**Do**

- Lead every page with a rendered strip or a live control.
- Keep yellow to one element per viewport.
- Use 2 px ink borders only for the three comic-structure elements in §10.
- Set numerals in mono where they change (width readout, versions, angle/intensity).
- Test every playground interaction with the keyboard before calling it done.

**Don't**

- Don't use Comic Sans, display-comic typefaces, halftone textures, starbursts, or
  tilted elements in the UI.
- Don't animate layout changes or add scroll effects.
- Don't put text on yellow other than `--accent-ink`, or yellow text on anything.
- Don't apply filters, rounded corners, or shadows to a `<comic-strip>`.
- Don't add a feature that generates content; the playground edits data the visitor
  wrote (see `SITE_DEV_PLAN.md` §0).

## 13. Agent prompt guide

When implementing a site component, an agent can use this paragraph as the brief:

> Build it with the tokens in `site/src/styles/tokens.css` (paper `#FBF8F1` / ink
> `#1B1A17` / accent yellow `#F5C400` / link blue `#1F4FD8`; dark counterparts via
> `data-theme`). Body DM Sans 17 px / 1.6, headings Bricolage Grotesque, code JetBrains
> Mono. 1 px `--rule` borders, radius 8 px, no shadows except menus/toasts/sheets. One
> yellow element per viewport. Focus ring 2 px `--link`. No motion beyond 200 ms
> colour/disclosure transitions, none under reduced motion. Rendered strips are never
> styled. Keyboard-operable, labelled, AA contrast.

Checklist before a component is done: tokens only (no raw hex in component CSS); both
themes checked; keyboard path works; reduced motion respected; mobile at 360 px wide;
axe clean on the `/_kitchen-sink` page.
