# Playground UI Renewal Plan

Scope: `/playground` only. Supersedes `DESIGN.md` §6.1 and `SITE_DEV_PLAN.md` §6.1
(layout) once accepted; §6.2 to §6.6 (state model, form fields, toolbar, share, non-goals)
are unchanged. Sequenced before S9 Korean so the markup is touched once.

## 1. Requirements review

| Requirement | Verdict | Notes |
|---|---|---|
| Preview full width at the bottom | Accept | Better for the reflow claim: the width slider can now go to the full viewport width. Height is the new constraint, so the top/bottom split must be draggable. |
| Config left, JSON right, above the preview | Accept | Form and JSON side by side makes form → JSON sync visible, which is the playground's teaching point. |
| Per-section scroll, no page scroll | Accept | Already the desktop rule (`height: calc(100dvh - header)`); the new grid keeps it. Below `md` (900 px) the three sections become tabs, since three stacked panes cannot fit a phone without page scroll. |
| Tabs in the config section per comic panel | Accept | Replaces the vertical card list. One tab per panel plus a leading **Strip** tab for document-level settings (packs, columns, gutter, strip title). Cards stay inside a tab for Scene / Characters / Lines. |
| shadcn/ui | Accept with a constraint | shadcn is React + Tailwind + Radix. The island is Preact (React was rejected in `SITE_DEV_PLAN.md` §3 on size) and the site has no Tailwind. See §2. |

Risks to decide before coding:

- **Selected-panel outline in the preview** currently follows the selected card. With tabs
  it follows the active tab. Clicking a panel in the preview activates its tab.
- **Panel count > 6** overflows the tab strip. Tabs scroll horizontally; the **+** button
  is pinned at the right.
- **Preview height** at the default split is about 40 % of the viewport. Multi-row strips
  scroll inside the stage; the stage keeps its own scrollbar, the page does not.

## 2. shadcn/ui on a Preact island

Recommended: **shadcn components via `preact/compat`, Tailwind v4 scoped to the island,
theme mapped to the existing tokens.** Only the components listed below are added; shadcn
is copy-in, so nothing else ships.

- `@astrojs/preact` gets `compat: true`, which aliases `react` and `react-dom` to
  `preact/compat`. Radix primitives run on compat (portals, `useId`, refs are covered by
  Preact 10.29).
- Tailwind v4 through `@tailwindcss/vite`, `@import "tailwindcss" source(none)` plus
  `@source "./src/components/playground"`, so no utility leaks into the rest of the site.
  The `@theme` block maps shadcn's names to `tokens.css`: `--color-background:
  var(--paper)`, `--color-foreground: var(--ink)`, `--color-border: var(--rule)`,
  `--color-primary: var(--accent)`, `--color-muted: var(--paper-sunken)`,
  `--radius: var(--radius-md)`. Dark mode keys off the existing `[data-theme="dark"]`
  attribute, not `prefers-color-scheme`.
- Icons from `lucide-preact`, not `lucide-react`.
- Components to add (`site/src/components/ui/`): Tabs, ResizablePanelGroup
  (`react-resizable-panels`), ScrollArea, Select, Popover, DropdownMenu, Slider,
  ToggleGroup, Tooltip, Sheet, Button. Eleven files, roughly 60 to 80 KB gzipped. Current
  playground budget is 450 KB gzipped (`scripts/check-budgets.mjs`); the budget holds.
- Fallback if the spike (step 1 below) fails on compat or on budget: keep shadcn as the
  visual and keyboard spec and hand-write the same eleven components in Preact with the
  existing `.button`/`.chip` classes. Same API, no Radix.

Do not use shadcn's `Form` (react-hook-form) or `Command`; the existing signals state
model stays.

### 2.1 Spike result (2026-09-03, step 1 done)

Gate passed: build green, budget holds, keyboard and theme checks pass on the kitchen
sink (`site/src/components/playground/UiSpike.tsx`, kept as the ui design check).
Findings that shape the rest of the work:

- **Works on compat**: Tabs, Select, ToggleGroup, Popover, DropdownMenu, Tooltip, Sheet
  (Dialog), ScrollArea, Slot/Button. Radix moves focus in a `setTimeout`, so e2e tests
  need a short settle after an arrow key.
- **Replaced**: Radix Slider (thumb index memoised before Preact's passive effects
  register collection items, so the thumb renders `display:none`) is a native
  `<input type="range">` with the shadcn look. react-resizable-panels v4 (wrong sizes,
  no drag or keyboard response on compat) is a 150-line two-pane split in
  `ui/resizable.tsx` with the same component names, `defaultLayout`/`onLayoutChange`.
- **Rules for new ui files**: any component passed as an `asChild` child must be a
  `forwardRef` component (Preact hands a plain function component's ref to the
  instance, which broke trigger focus-return). Icons from `lucide-preact`.
- **Config**: `preact({ compat: true })`; `tslib` aliased to its ESM build and Radix
  deps in `noExternal` for the prerender environment (see `astro.config.mjs`);
  `tsconfig` paths map `react` to `preact/compat`; Tailwind v4 scoped through
  `@source` in `playground-ui.css`, no preflight.
- Kitchen-sink JS is 75 KB gzipped for all eleven components plus preact/compat.

## 3. Layout spec

Desktop (`≥ 900 px`), full-bleed under the header, no page scroll:

```
┌─────────────────────────┬─────────────────────────┐
│ Configure               │ JSON        ● Valid     │  top row
│ [Strip][1][2][3]  [+]   │ Format  Copy            │  ResizablePanel (h)
│  ┌ Scene ───────────┐   │ {                       │  default 60 %
│  │ backdrop camera  │   │   "panels": [ …         │  min 30 %
│  └──────────────────┘   │                         │
│  ┌ Characters ──────┐   │                         │
│  …(scrolls)             │ …(CodeMirror scrolls)   │
├═════════════════════════╧═════════════════════════┤  drag handle (v)
│ Preview  [width ─●── 820] phone tablet desktop fill  ⟳ dark  Share  Export ▾ │
│              ┌─ strip, centred, own scroll ─┐      │  bottom row
│              └──────────────────────────────┘      │  default 40 %, min 25 %
│ 3 columns · 4 panels · 5 characters                │
└────────────────────────────────────────────────────┘
```

- Outer: `ResizablePanelGroup direction="vertical"`; inner top: `direction="horizontal"`,
  Configure `minmax(22rem, 1fr)` vs JSON `1fr`, default 50/50. Both split ratios persist
  to `localStorage` (guarded, like autosave).
- Each pane: 36 px header bar (title left, actions right), `ScrollArea` body, `min-height: 0`
  at every grid level. CodeMirror gets `height: 100%` and its own scroller.
- Preview toolbar is unchanged from `DESIGN.md` §6.4 except it now spans the full width,
  so the width slider's max becomes `min(1240, stage width)` and **fill** means the stage.
- Collapsing: the JSON pane collapses to a 36 px vertical bar at the right edge
  (ResizablePanel `collapsible`); the preview collapses to its toolbar. Nothing collapses
  to zero, so every pane stays reachable by keyboard.

Below `md`: a `Tabs` strip *Configure / JSON / Preview* under the header, one pane at a
time, each with its own scroll. The bottom `Sheet` (55 %) still opens the preview from
Configure or JSON. This is the current mobile behaviour on new primitives.

## 4. Configure pane

- `Tabs` strip: **Strip** first, then one tab per panel labelled by index (title in a
  tooltip), then a **+** ghost button. Tab overflow scrolls horizontally with edge fades.
  Keyboard: ←/→ between tabs, `Delete` on a focused panel tab prompts removal.
- Panel tab body: the three existing groups as cards (Scene, Characters, Lines), then a
  footer row with **Duplicate**, **Move left / right**, **Remove** (destructive style,
  confirm through a Popover, not `window.confirm`).
- Strip tab body: pack toggles, columns, gutter, strip title, presets `Select`, Reset.
- Controls map onto shadcn: backdrop and character pickers are `Popover` grids (existing
  thumbnail markup inside), camera and pose are `ToggleGroup`, speaker and balloon are
  `Select`, intensity readout stays a numeric input. The emotion wheel is untouched.
- Every control keeps its accessible name; `tests/e2e/playground.spec.ts` selects by
  role and name, so those names must not change (`+ Add panel`, `+ Add character`,
  `Share`, the `Emotion` slider).

## 5. Steps

| # | Work | Gate | Estimate |
|---|---|---|---|
| 1 | **Done.** Spike: `compat: true`, Tailwind v4 scoped, all eleven ui components on the `kitchen-sink` page. | Passed, see §2.1. | Half a day. Decided: shadcn on compat, with Slider and Resizable replaced. |
| 2 | **Done.** New shell: `Playground.tsx` is the two-level `ResizablePanelGroup` with pane headers; mobile `Tabs` and `Sheet`; JSON collapses to a 36 px bar. Old grid rules removed from `playground.css`. | Passed: e2e "shell:" test covers the three viewports, split drag persistence, and collapse. Shell clips with `overflow-hidden`: the form's scroll container alone still let the document grow. | 1 day |
| 3 | **Done.** Configure pane: per-panel `Tabs`, Strip tab (packs, preset `Select`, reset, summary), panel footer actions with a `Popover` confirm on Remove; preview click activates the tab (`stripTab` signal in `state.ts`). | Passed: e2e "configure tabs:" test. The two pre-existing e2e failures are unchanged. | 1 day |
| 4 | Swap remaining controls (pickers, camera, pose, speaker, balloon, presets, Export menu) onto the ui components; remove dead CSS. | `axe` clean; `playground.spec.ts` green; keyboard-only 2-panel authoring still passes. | 1 day |
| 5 | Docs: rewrite `DESIGN.md` §6.1 and `SITE_DEV_PLAN.md` §6.1 to this layout; add the `ui/` folder to §3 of the site plan; `WORKLOG.md` entry; bump site to 0.9.0. | `HANDOFF.md` under 50 lines. | 1 hour |

Total: about 4 days. Step 1 is the only step with an unknown outcome; do it first and
alone.

## 6. Out of scope

No new features (no AI, no server render, per §6.6). No change to the state model, share
format, export, autosave, or undo. No Tailwind outside the playground island. Korean
strings land in S9 on top of this markup.
