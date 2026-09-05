/**
 * Configure pane (SITE_DEV_PLAN.md §6.3, PLAYGROUND_UI_PLAN.md §4): a Strip tab for
 * document-level settings, then one tab per panel. The active panel tab is the
 * selected panel, which the preview outlines and whose canvas, when clicked, opens
 * the tab. Controls are shadcn/ui components; the emotion wheel is bespoke.
 */
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Plus, Trash2, X } from "lucide-preact";
import type { Panel, CameraPreset } from "@toonstrip/schema";
import { EmotionWheel, EmotionLabel, emotionName } from "./EmotionWheel";
import type { Lang } from "../../i18n/utils";
import { interpolate } from "../../i18n/utils";
import type { PlaygroundStrings } from "./strings";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "../ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Input, Textarea, Label, Checkbox } from "../ui/input";
import { cn } from "../../lib/utils";
import { spriteCropStyle } from "../../lib/sprite-crop";
import {
  doc, selectedPanel, stripTab, activeCharacters, activeBackdrops, roster, packs, togglePack, presets, loadPreset,
  addPanel, duplicatePanel, removePanel, movePanel, updatePanel,
  addBody, updateBody, removeBody, moveBody,
  addLine, updateLine, removeLine, moveLine,
} from "../../lib/playground/state";

const CAMERAS: CameraPreset[] = ["establishing", "wide", "medium", "over-shoulder", "close-up", "reaction"];
const POSES = ["none", "wave", "point", "shrug"] as const;

const DASHED = "w-full justify-center border border-dashed border-border-strong text-muted-foreground hover:text-foreground";

/** Dashed full-width "add" affordance so empty groups have an obvious target (DESIGN.md §6.2). */
function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" class={DASHED} aria-label={`+ ${label}`} onClick={onClick}>
      <Plus /> {label}
    </Button>
  );
}

function Group({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <fieldset class="m-0 flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <legend class="caption px-1">{title}</legend>
      {children}
    </fieldset>
  );
}

export function PanelForm({ strings, lang }: { strings: PlaygroundStrings; lang?: Lang }) {
  const d = doc.value;
  const last = Math.max(0, d.panels.length - 1);
  const current = Math.min(selectedPanel.value, last);
  const value = stripTab.value || d.panels.length === 0 ? "strip" : String(current);
  const onTab = (v: string) => {
    if (v === "strip") stripTab.value = true;
    else {
      stripTab.value = false;
      selectedPanel.value = Number(v);
    }
  };
  return (
    <Tabs value={value} onValueChange={onTab} class="pg-form gap-0">
      <div class="sticky -top-4 z-10 -mx-4 -mt-4 mb-4 flex items-center gap-2 border-b border-border bg-background px-4 py-2">
        <TabsList aria-label="Strip and panels" class="max-w-full flex-nowrap justify-start overflow-x-auto">
          <TabsTrigger value="strip" class="flex-none">{strings.strip.tabLabel}</TabsTrigger>
          {d.panels.map((p, i) => (
            <TabsTrigger
              key={i}
              value={String(i)}
              class="min-w-8 flex-none"
              aria-label={interpolate(strings.panel.label, { n: i + 1 })}
              title={p.roomTitle ? interpolate(strings.panel.labelWithRoom, { n: i + 1, title: p.roomTitle }) : interpolate(strings.panel.label, { n: i + 1 })}
            >
              {i + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button variant="ghost" class="ml-auto shrink-0" aria-label={`+ ${strings.strip.addPanel}`} onClick={() => addPanel()}>
          <Plus /> {strings.strip.addPanel}
        </Button>
      </div>

      <TabsContent value="strip">
        <StripSettings strings={strings} />
      </TabsContent>
      {d.panels.map((panel, i) => (
        <TabsContent key={i} value={String(i)}>
          <PanelEditor panel={panel} index={i} total={d.panels.length} strings={strings} lang={lang} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function StripSettings({ strings }: { strings: PlaygroundStrings }) {
  const d = doc.value;
  const list = presets.value;
  const bodies = new Set(d.panels.flatMap((p) => p.bodies.map((b) => b.character)));
  return (
    <div class="flex flex-col gap-4">
      <Group title={strings.strip.assetPacks}>
        <ToggleGroup
          type="multiple"
          value={packs.value}
          onValueChange={(next: string[]) => {
            for (const name of roster.value.packNames) if (packs.value.includes(name) !== next.includes(name)) togglePack(name);
          }}
          aria-label={strings.strip.assetPacks}
        >
          {roster.value.packNames.map((name) => (
            <ToggleGroupItem key={name} value={name} class="font-mono">{name}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p class="m-0 text-sm text-muted-foreground">{strings.strip.assetPacksHint}</p>
      </Group>
      <Group title={strings.strip.presets}>
        <Label for="pg-preset">{strings.strip.loadPreset}</Label>
        <Select onValueChange={(name: string) => { const p = list.find((x) => x.name === name); if (p) loadPreset(p); }}>
          <SelectTrigger id="pg-preset" class="max-w-xs" aria-label={strings.strip.loadPreset}>
            <SelectValue placeholder={strings.strip.choosePreset} />
          </SelectTrigger>
          <SelectContent>
            {list.map((p) => (
              <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p class="m-0 text-sm text-muted-foreground">{strings.strip.presetHint}</p>
        {list[0] && <Button class="self-start" onClick={() => loadPreset(list[0])}>{strings.strip.resetToFirst}</Button>}
      </Group>
      <Group title={strings.strip.thisStrip}>
        <dl class="mono m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted-foreground">panels</dt><dd class="m-0">{d.panels.length}</dd>
          <dt class="text-muted-foreground">characters</dt><dd class="m-0">{bodies.size === 0 ? "none" : [...bodies].join(", ")}</dd>
          <dt class="text-muted-foreground">lines</dt><dd class="m-0">{d.panels.reduce((n, p) => n + p.speakers.length, 0)}</dd>
        </dl>
      </Group>
    </div>
  );
}

function PanelEditor({ panel, index, total, strings, lang }: { panel: Panel; index: number; total: number; strings: PlaygroundStrings; lang?: Lang }) {
  const [picker, setPicker] = useState(false);
  const backdrops = activeBackdrops.value;
  const characters = activeCharacters.value;
  const onStage = panel.bodies.map((b) => b.character);

  return (
    <div class="pg-panel-editor flex flex-col gap-4" aria-label={interpolate(strings.panel.label, { n: index + 1 })}>
      <Group title={strings.panel.scene}>
        <div>
          <Label>{strings.panel.backdrop}</Label>
          <div class="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={strings.panel.backdrop}>
            {backdrops.map((b) => {
              const on = panel.backdrop === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={`${b.id} (${b.pack})`}
                  onClick={() => updatePanel(index, { backdrop: b.id })}
                  class={cn(
                    "flex flex-col items-center gap-1 rounded-md border-2 bg-card p-1 font-mono text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "border-primary" : "border-border hover:border-border-strong",
                  )}
                >
                  <img src={b.url} alt="" width={64} height={54} loading="lazy" class="rounded-sm object-cover" />
                  <span>{b.id}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>{strings.panel.camera}</Label>
          <ToggleGroup type="single" class="mt-1 max-w-full flex-wrap" value={panel.camera ?? "medium"} onValueChange={(v: CameraPreset) => v && updatePanel(index, { camera: v })} aria-label={strings.panel.camera}>
            {CAMERAS.map((cam) => (
              <ToggleGroupItem key={cam} value={cam}>{cam}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-40 flex-1">
            <Label for={`room-${index}`}>{strings.panel.roomTitle}</Label>
            <Input id={`room-${index}`} class="mt-1" value={panel.roomTitle ?? ""} placeholder={strings.panel.roomTitlePlaceholder} onInput={(e) => updatePanel(index, { roomTitle: (e.currentTarget as HTMLInputElement).value || undefined })} />
          </div>
          <Checkbox label={strings.panel.dark} checked={!!panel.dark} onChange={(e) => updatePanel(index, { dark: (e.currentTarget as HTMLInputElement).checked || undefined })} />
        </div>
      </Group>

      <Group title={strings.character.title}>
        {panel.bodies.length === 0 && <p class="m-0 text-sm text-muted-foreground">{strings.character.none}</p>}
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {panel.bodies.map((body, j) => {
            const c = characters.find((x) => x.id === body.character);
            const hasLine = panel.speakers.some((l) => l.speaker === body.character);
            return (
              <li key={j} class="flex flex-col gap-3 rounded-md border border-border p-3">
                <div class="flex items-center gap-2">
                  {c && <span class="pg-sprite" style={spriteCropStyle(c, 40)} aria-hidden="true" />}
                  <span class="mono">{body.character}</span>
                  <span class="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={strings.character.moveLeft} disabled={j === 0} onClick={() => moveBody(index, j, -1)}><ChevronLeft /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={strings.character.moveRight} disabled={j === panel.bodies.length - 1} onClick={() => moveBody(index, j, 1)}><ChevronRight /></Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!hasLine) return removeBody(index, j);
                        // Keyboard-safe: no confirm() dialogs; reassign to the first other body if any, else caption.
                        const target = onStage.filter((id) => id !== body.character)[0];
                        removeBody(index, j, target ?? "caption");
                      }}
                    >
                      {hasLine ? strings.character.removeReassign : strings.character.remove}
                    </Button>
                  </span>
                </div>
                <div class="flex flex-wrap items-start gap-4">
                  <EmotionWheel angle={body.emotion.angle} intensity={body.emotion.intensity} onChange={(angle, intensity) => updateBody(index, j, { emotion: { angle, intensity } })} lang={lang} />
                  <div class="flex min-w-40 flex-1 flex-col gap-2">
                    <EmotionLabel name={emotionName(body.emotion.angle, body.emotion.intensity)} lang={lang} />
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <Label>{strings.character.angle}</Label>
                        <Input type="number" step="0.01" min="0" max="6.2832" value={body.emotion.angle} aria-label={strings.character.angle} onInput={(e) => updateBody(index, j, { emotion: { ...body.emotion, angle: Number((e.currentTarget as HTMLInputElement).value) || 0 } })} />
                      </div>
                      <div>
                        <Label>{strings.character.intensity}</Label>
                        <Input type="number" step="0.05" min="0" max="1" value={body.emotion.intensity} aria-label={strings.character.intensity} onInput={(e) => updateBody(index, j, { emotion: { ...body.emotion, intensity: Math.max(0, Math.min(1, Number((e.currentTarget as HTMLInputElement).value) || 0)) } })} />
                      </div>
                    </div>
                    <div>
                      <Label>{strings.character.pose}</Label>
                      <ToggleGroup type="single" class="mt-1" value={body.pose ?? "none"} onValueChange={(pose: (typeof POSES)[number]) => pose && updateBody(index, j, { pose: pose === "none" ? undefined : pose })} aria-label={strings.character.pose}>
                        {POSES.map((pose) => (
                          <ToggleGroupItem key={pose} value={pose}>{pose}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    {!hasLine && (
                      <Checkbox label={strings.character.keepOnStage} checked={!!body.requested} onChange={(e) => updateBody(index, j, { requested: (e.currentTarget as HTMLInputElement).checked || undefined })} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Popover open={picker} onOpenChange={setPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" class={DASHED} aria-label={`+ ${strings.character.add}`}>
              <Plus /> {strings.character.add}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-[min(24rem,calc(100vw-2rem))]" aria-label={strings.character.choose}>
            <div class="mb-2 flex items-center">
              <span class="caption">{strings.character.choose}</span>
              <PopoverClose asChild>
                <Button variant="ghost" size="icon-sm" class="ml-auto" aria-label={strings.character.close}><X /></Button>
              </PopoverClose>
            </div>
            <div class="grid max-h-72 grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2 overflow-auto">
              {characters.map((c) => (
                <button
                  key={`${c.pack}/${c.id}`}
                  type="button"
                  title={`${c.name} (${c.pack})`}
                  class="flex flex-col items-center gap-1 rounded-md border border-border bg-card p-1 font-mono text-xs outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    addBody(index, c.id);
                    setPicker(false);
                  }}
                >
                  <span class="flex size-14 items-center justify-center overflow-hidden"><span class="pg-sprite" style={spriteCropStyle(c, 48)} aria-hidden="true" /></span>
                  <span>{c.id}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </Group>

      <Group title={strings.line.title}>
        {panel.speakers.length === 0 && <p class="m-0 text-sm text-muted-foreground">{strings.line.none}</p>}
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {panel.speakers.map((line, k) => (
            <li key={k} class="pg-line flex flex-col gap-2 rounded-md border border-border p-3">
              <div class="flex flex-wrap items-end gap-2">
                <div class="min-w-28 flex-1">
                  <Label>{strings.line.speaker}</Label>
                  <Select value={line.speaker} onValueChange={(v: string) => updateLine(index, k, { speaker: v })}>
                    <SelectTrigger class="mt-1" aria-label={strings.line.speaker}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caption">caption</SelectItem>
                      {onStage.map((id) => (
                        <SelectItem key={id} value={id}>{id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div class="min-w-28 flex-1">
                  <Label>{strings.line.balloon}</Label>
                  <Select value={line.balloon} disabled={line.speaker === "caption"} onValueChange={(v: string) => updateLine(index, k, { balloon: v as any })}>
                    <SelectTrigger class="mt-1" aria-label={strings.line.balloon}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speech">speech</SelectItem>
                      <SelectItem value="thought">thought</SelectItem>
                      <SelectItem value="caption">caption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span class="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={strings.line.moveUp} disabled={k === 0} onClick={() => moveLine(index, k, -1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={strings.line.moveDown} disabled={k === panel.speakers.length - 1} onClick={() => moveLine(index, k, 1)}><ArrowDown /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={strings.line.remove} onClick={() => removeLine(index, k)}><X /></Button>
                </span>
              </div>
              <Textarea rows={2} value={line.text} placeholder={strings.line.textPlaceholder} aria-label={strings.line.textPlaceholder} onInput={(e) => updateLine(index, k, { text: (e.currentTarget as HTMLTextAreaElement).value })} />
              <span class="mono text-xs text-muted-foreground">{interpolate(strings.line.charsCount, { count: line.text.length })}</span>
            </li>
          ))}
        </ul>
        <div class="grid grid-cols-2 gap-2">
          <AddButton label={strings.line.add} onClick={() => addLine(index, onStage[0] ?? "caption")} />
          <AddButton label={strings.line.addCaption} onClick={() => addLine(index, "caption")} />
        </div>
      </Group>

      <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4" role="group" aria-label={interpolate(strings.panel.actionsAria, { n: index + 1 })}>
        <Button variant="ghost" size="icon" aria-label={strings.panel.moveLeft} disabled={index === 0} onClick={() => movePanel(index, -1)}><ChevronLeft /></Button>
        <Button variant="ghost" size="icon" aria-label={strings.panel.moveRight} disabled={index === total - 1} onClick={() => movePanel(index, 1)}><ChevronRight /></Button>
        <Button variant="ghost" onClick={() => duplicatePanel(index)}><Copy /> {strings.panel.duplicate}</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="destructive" class="ml-auto" disabled={total === 1}><Trash2 /> {strings.panel.remove}</Button>
          </PopoverTrigger>
          <PopoverContent align="end" class="w-60">
            <p class="mb-3 text-sm">{interpolate(strings.panel.removeConfirm, { n: index + 1 })}</p>
            <div class="flex justify-end gap-2">
              <PopoverClose asChild><Button variant="ghost" size="sm">{strings.panel.cancel}</Button></PopoverClose>
              <PopoverClose asChild><Button variant="primary" size="sm" onClick={() => removePanel(index)}>{strings.panel.removePanel}</Button></PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
