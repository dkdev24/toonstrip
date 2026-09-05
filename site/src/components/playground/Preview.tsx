/** Live preview + toolbar (SITE_DEV_PLAN.md §6.4, DESIGN.md §6.4) on shadcn/ui controls. */
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { layoutStrip } from "@toonstrip/core";
import { ChevronDown, Download, Moon, Redo2, Share2, Sun, Undo2 } from "lucide-preact";
import { doc, packs, packUrls, selectedPanel, stripTab, shareHash, presets, loadPreset, showToast, undo, redo, canUndo, canRedo } from "../../lib/playground/state";
import { renderStripPng, downloadBlob, astroSnippet, htmlSnippet } from "../../lib/playground/export";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from "../ui/dropdown-menu";
import { interpolate } from "../../i18n/utils";
import type { PlaygroundStrings } from "./strings";

const GUTTER = 10;
// `key` is the toggle value (stable, language-invariant); the displayed label comes
// from `strings.preset*` so it's translated without disturbing the selected-preset match.
const PRESET_WIDTHS = [
  { key: "phone", width: 390 },
  { key: "tablet", width: 768 },
  { key: "desktop", width: 1240 },
  { key: "fill", width: 0 },
] as const;

// The element type isn't a DOM built-in; treat it structurally.
interface StripEl extends HTMLElement {
  document: unknown;
  packs: string[];
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ComponentChildren }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Preview({ strings }: { strings: PlaygroundStrings["preview"] }) {
  const presetLabel = (key: string): string =>
    ({ phone: strings.presetPhone, tablet: strings.presetTablet, desktop: strings.presetDesktop, fill: strings.presetFill })[key] ?? key;
  const stripRef = useRef<StripEl>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0); // 0 = fill
  const [stageWidth, setStageWidth] = useState(0);
  const [dark, setDark] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
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
  const sliderMax = Math.max(260, Math.min(1240, stageWidth || 1240));
  const presetValue = PRESET_WIDTHS.find((p) => p.width === width)?.key ?? "";

  async function exportPng() {
    setBusy(true);
    try {
      const blob = await renderStripPng(doc.value, packUrls.value, { width: effective || 1200, scale: 2, transparent, background: dark ? "#0f0e0b" : "#ffffff" });
      downloadBlob(blob, "toonstrip.png");
      showToast(strings.pngDownloaded);
    } catch (err) {
      showToast(interpolate(strings.exportFailed, { message: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, copiedMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(copiedMessage);
    } catch {
      showToast(strings.clipboardBlocked);
    }
  }

  async function share() {
    const url = `${location.origin}${location.pathname}${shareHash.value}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(strings.shareLinkCopied);
    } catch {
      history.replaceState(null, "", shareHash.value);
      showToast(strings.linkInAddressBar);
    }
  }

  const panelCount = doc.value.panels.length;

  return (
    <div class="pg-preview flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-1.5" role="toolbar" aria-label="Preview">
        <div class="flex min-w-32 flex-1 basis-40 items-center gap-2">
          <Slider min={260} max={sliderMax} step={10} value={width || Math.min(stageWidth, sliderMax) || 260} onValueChange={(v) => setWidth(v)} aria-label={strings.containerWidth} />
        </div>
        <output class="mono shrink-0 text-xs text-muted-foreground" aria-live="polite">
          {Math.round(effective)} px · {columns} {columns === 1 ? strings.columnUnit : strings.columnUnitPlural}
        </output>
        <ToggleGroup type="single" value={presetValue} onValueChange={(key: string) => { const p = PRESET_WIDTHS.find((x) => x.key === key); if (p) setWidth(p.width); }} aria-label={strings.widthPresetsAria}>
          {PRESET_WIDTHS.map((p) => (
            <ToggleGroupItem key={p.key} value={p.key}>{presetLabel(p.key)}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={dark ? "primary" : "secondary"} size="icon" aria-label={strings.darkSurface} aria-pressed={dark} onClick={() => setDark(!dark)}>
              {dark ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{strings.darkSurfaceHint}</TooltipContent>
        </Tooltip>
        <span class="flex-1" />
        <IconButton label={strings.undo} disabled={!canUndo.value} onClick={undo}><Undo2 /></IconButton>
        <IconButton label={strings.redo} disabled={!canRedo.value} onClick={redo}><Redo2 /></IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>{strings.presetsButton} <ChevronDown /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="max-h-80 overflow-auto">
            <DropdownMenuLabel>{strings.loadPresetMenuLabel}</DropdownMenuLabel>
            {presets.value.map((p) => (
              <DropdownMenuItem key={p.name} onSelect={() => { loadPreset(p); stripTab.value = false; }}>{p.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={share}><Share2 /> {strings.share}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="primary"><Download /> {strings.export} <ChevronDown /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56">
            <DropdownMenuItem disabled={busy} onSelect={exportPng}>{busy ? strings.rendering : strings.downloadPng}</DropdownMenuItem>
            <DropdownMenuCheckboxItem checked={transparent} onCheckedChange={(v: boolean) => setTransparent(v)} onSelect={(e: Event) => e.preventDefault()}>
              {strings.transparentBackground}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => copy(JSON.stringify(doc.value, null, 2), strings.copiedJson)}>{strings.copyJson}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => copy(astroSnippet(doc.value, packs.value), strings.copiedAstro)}>{strings.copyAstro}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => copy(htmlSnippet(doc.value, packs.value), strings.copiedHtml)}>{strings.copyHtml}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      <p class="mono m-0 shrink-0 border-t border-border bg-background px-4 py-1 text-xs text-muted-foreground">
        {panelCount} {panelCount === 1 ? strings.panelUnit : strings.panelUnitPlural} · {strings.packsLabel}: {packs.value.join(", ")}
      </p>
    </div>
  );
}
