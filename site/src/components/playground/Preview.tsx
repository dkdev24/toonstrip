/** Live preview + toolbar (SITE_DEV_PLAN.md §6.4, DESIGN.md §6.4). */
import { useEffect, useRef, useState } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { layoutStrip } from "@toonstrip/core";
import { doc, packs, packUrls, selectedPanel, stripTab, shareHash, presets, loadPreset, showToast, undo, redo, canUndo, canRedo } from "../../lib/playground/state";
import { renderStripPng, downloadBlob, astroSnippet, htmlSnippet } from "../../lib/playground/export";

const GUTTER = 10;
const PRESET_WIDTHS = [
  { label: "Phone", width: 390 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 1240 },
  { label: "Fill", width: 0 },
];

// The element type isn't a DOM built-in; treat it structurally.
interface StripEl extends HTMLElement {
  document: unknown;
  packs: string[];
}

export function Preview() {
  const stripRef = useRef<StripEl>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0); // 0 = fill
  const [stageWidth, setStageWidth] = useState(0);
  const [dark, setDark] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<"export" | "presets" | null>(null);
  // Render <comic-strip> only after its class is defined: setting `document`
  // on an un-upgraded element creates an own property that shadows the
  // accessor once the upgrade happens, and nothing ever renders.
  const [elementReady, setElementReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    import("@toonstrip/element").then(() => {
      readyRef.current = true;
      setElementReady(true);
    });
    const stage = stageRef.current!;
    const ro = new ResizeObserver(() => setStageWidth(stage.clientWidth - 48));
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useSignalEffect(() => {
    const el = stripRef.current;
    const urls = packUrls.value;
    const d = doc.value;
    if (!el || !readyRef.current) return;
    el.packs = urls;
    el.document = d;
  });

  // First paint after the element is defined (the signal effect above ran too early).
  useEffect(() => {
    const el = stripRef.current;
    if (!el || !elementReady) return;
    el.packs = packUrls.value;
    el.document = doc.value;
  }, [elementReady]);

  // Outline the selected panel by index inside the element's shadow root.
  useSignalEffect(() => {
    const el = stripRef.current;
    const index = selectedPanel.value;
    if (!el) return;
    const apply = () => {
      const canvases = el.shadowRoot?.querySelectorAll("canvas") ?? [];
      canvases.forEach((c, i) => ((c as HTMLElement).style.outline = i === index ? "3px solid var(--accent)" : ""));
    };
    apply();
    const t = setTimeout(apply, 300);
    return () => clearTimeout(t);
  });

  const effective = width === 0 ? stageWidth : Math.min(width, stageWidth);
  const columns = effective > 0 ? Math.min(layoutStrip(effective, { gutter: GUTTER }).columns, Math.max(1, doc.value.panels.length)) : 1;

  async function exportPng() {
    setBusy(true);
    try {
      const blob = await renderStripPng(doc.value, packUrls.value, { width: effective || 1200, scale: 2, transparent, background: dark ? "#0f0e0b" : "#ffffff" });
      downloadBlob(blob, "toonstrip.png");
      showToast("PNG downloaded");
    } catch (err) {
      showToast(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      setMenu(null);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${what} copied`);
    } catch {
      showToast("Clipboard blocked; select the JSON pane and copy manually");
    }
    setMenu(null);
  }

  async function share() {
    const url = `${location.origin}${location.pathname}${shareHash.value}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Share link copied");
    } catch {
      history.replaceState(null, "", shareHash.value);
      showToast("Link is in the address bar");
    }
  }

  return (
    <div class="pg-preview">
      <div class="pg-toolbar" role="toolbar" aria-label="Preview">
        <label class="pg-toolbar__width">
          <span class="visually-hidden">Container width</span>
          <input type="range" min={260} max={1240} step={10} value={width || stageWidth} onInput={(e) => setWidth(Number((e.currentTarget as HTMLInputElement).value))} />
        </label>
        <output class="mono pg-toolbar__readout" aria-live="polite">
          {Math.round(effective)} px · {columns} col
        </output>
        <span class="pg-toolbar__presets">
          {PRESET_WIDTHS.map((p) => (
            <button key={p.label} type="button" class="chip" aria-pressed={width === p.width} onClick={() => setWidth(p.width)}>
              {p.label}
            </button>
          ))}
        </span>
        <button type="button" class="chip" aria-pressed={dark} onClick={() => setDark(!dark)}>
          Dark surface
        </button>
        <span class="pg-toolbar__spacer" />
        <button type="button" class="button button--ghost button--dense" disabled={!canUndo.value} onClick={undo} aria-label="Undo">
          Undo
        </button>
        <button type="button" class="button button--ghost button--dense" disabled={!canRedo.value} onClick={redo} aria-label="Redo">
          Redo
        </button>
        <span class="pg-menu">
          <button type="button" class="button button--secondary button--dense" aria-haspopup="menu" aria-expanded={menu === "presets"} onClick={() => setMenu(menu === "presets" ? null : "presets")}>
            Presets
          </button>
          {menu === "presets" && (
            <ul class="pg-menu__list" role="menu">
              {presets.value.map((p) => (
                <li key={p.name} role="none">
                  <button type="button" role="menuitem" onClick={() => { loadPreset(p); setMenu(null); }}>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </span>
        <button type="button" class="button button--secondary button--dense" onClick={share}>
          Share
        </button>
        <span class="pg-menu">
          <button type="button" class="button button--primary button--dense" aria-haspopup="menu" aria-expanded={menu === "export"} onClick={() => setMenu(menu === "export" ? null : "export")}>
            Export
          </button>
          {menu === "export" && (
            <ul class="pg-menu__list" role="menu">
              <li role="none"><button type="button" role="menuitem" disabled={busy} onClick={exportPng}>{busy ? "Rendering…" : "Download PNG"}</button></li>
              <li role="none">
                <label class="pg-menu__check">
                  <input type="checkbox" checked={transparent} onChange={(e) => setTransparent((e.currentTarget as HTMLInputElement).checked)} /> Transparent background
                </label>
              </li>
              <li role="none"><button type="button" role="menuitem" onClick={() => copy(JSON.stringify(doc.value, null, 2), "JSON")}>Copy JSON</button></li>
              <li role="none"><button type="button" role="menuitem" onClick={() => copy(astroSnippet(doc.value, packs.value), "Astro snippet")}>Copy Astro snippet</button></li>
              <li role="none"><button type="button" role="menuitem" onClick={() => copy(htmlSnippet(doc.value, packs.value), "HTML snippet")}>Copy HTML snippet</button></li>
            </ul>
          )}
        </span>
      </div>
      <div ref={stageRef} class={`pg-stage${dark ? " pg-stage--dark" : ""}`}>
        <div class="pg-stage__container" style={width === 0 ? "width:100%" : `width:${Math.min(width, stageWidth || width)}px`}>
          {/* Clicking a panel selects it in the Configure pane (its tab opens). */}
          {/* @ts-expect-error custom element */}
          {elementReady && <comic-strip ref={stripRef} onClick={(e: MouseEvent) => {
            const canvas = e.composedPath().find((n) => n instanceof HTMLCanvasElement) as HTMLCanvasElement | undefined;
            if (!canvas) return;
            const all = Array.from(stripRef.current?.shadowRoot?.querySelectorAll("canvas") ?? []);
            const i = all.indexOf(canvas);
            if (i >= 0) { selectedPanel.value = i; stripTab.value = false; }
          }} />}
        </div>
      </div>
      <p class="pg-statusline mono">
        {doc.value.panels.length} panel{doc.value.panels.length === 1 ? "" : "s"} · packs: {packs.value.join(", ")}
      </p>
    </div>
  );
}
