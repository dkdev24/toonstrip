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
import { EmotionWheel, emotionName } from "./EmotionWheel";
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

export function PanelForm() {
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
          <TabsTrigger value="strip" class="flex-none">Strip</TabsTrigger>
          {d.panels.map((p, i) => (
            <TabsTrigger key={i} value={String(i)} class="min-w-8 flex-none" aria-label={`Panel ${i + 1}`} title={p.roomTitle ? `Panel ${i + 1}: ${p.roomTitle}` : `Panel ${i + 1}`}>
              {i + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button variant="ghost" class="ml-auto shrink-0" aria-label="+ Add panel" onClick={() => addPanel()}>
          <Plus /> Add panel
        </Button>
      </div>

      <TabsContent value="strip">
        <StripSettings />
      </TabsContent>
      {d.panels.map((panel, i) => (
        <TabsContent key={i} value={String(i)}>
          <PanelEditor panel={panel} index={i} total={d.panels.length} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function StripSettings() {
  const d = doc.value;
  const list = presets.value;
  const bodies = new Set(d.panels.flatMap((p) => p.bodies.map((b) => b.character)));
  return (
    <div class="flex flex-col gap-4">
      <Group title="Asset packs">
        <ToggleGroup
          type="multiple"
          value={packs.value}
          onValueChange={(next: string[]) => {
            for (const name of roster.value.packNames) if (packs.value.includes(name) !== next.includes(name)) togglePack(name);
          }}
          aria-label="Asset packs"
        >
          {roster.value.packNames.map((name) => (
            <ToggleGroupItem key={name} value={name} class="font-mono">{name}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p class="m-0 text-sm text-muted-foreground">Characters and backdrops from every enabled pack are available in the pickers.</p>
      </Group>
      <Group title="Presets">
        <Label for="pg-preset">Load a preset</Label>
        <Select onValueChange={(name: string) => { const p = list.find((x) => x.name === name); if (p) loadPreset(p); }}>
          <SelectTrigger id="pg-preset" class="max-w-xs" aria-label="Load a preset">
            <SelectValue placeholder="Choose a preset…" />
          </SelectTrigger>
          <SelectContent>
            {list.map((p) => (
              <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p class="m-0 text-sm text-muted-foreground">Replaces the current strip. Undo with Ctrl/Cmd+Z.</p>
        {list[0] && <Button class="self-start" onClick={() => loadPreset(list[0])}>Reset to the first preset</Button>}
      </Group>
      <Group title="This strip">
        <dl class="mono m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted-foreground">panels</dt><dd class="m-0">{d.panels.length}</dd>
          <dt class="text-muted-foreground">characters</dt><dd class="m-0">{bodies.size === 0 ? "none" : [...bodies].join(", ")}</dd>
          <dt class="text-muted-foreground">lines</dt><dd class="m-0">{d.panels.reduce((n, p) => n + p.speakers.length, 0)}</dd>
        </dl>
      </Group>
    </div>
  );
}

function PanelEditor({ panel, index, total }: { panel: Panel; index: number; total: number }) {
  const [picker, setPicker] = useState(false);
  const backdrops = activeBackdrops.value;
  const characters = activeCharacters.value;
  const onStage = panel.bodies.map((b) => b.character);

  return (
    <div class="pg-panel-editor flex flex-col gap-4" aria-label={`Panel ${index + 1}`}>
      <Group title="Scene">
        <div>
          <Label>Backdrop</Label>
          <div class="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Backdrop">
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
          <Label>Camera</Label>
          <ToggleGroup type="single" class="mt-1 max-w-full flex-wrap" value={panel.camera ?? "medium"} onValueChange={(v: CameraPreset) => v && updatePanel(index, { camera: v })} aria-label="Camera">
            {CAMERAS.map((cam) => (
              <ToggleGroupItem key={cam} value={cam}>{cam}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-40 flex-1">
            <Label for={`room-${index}`}>Room title</Label>
            <Input id={`room-${index}`} class="mt-1" value={panel.roomTitle ?? ""} placeholder="none" onInput={(e) => updatePanel(index, { roomTitle: (e.currentTarget as HTMLInputElement).value || undefined })} />
          </div>
          <Checkbox label="Dark" checked={!!panel.dark} onChange={(e) => updatePanel(index, { dark: (e.currentTarget as HTMLInputElement).checked || undefined })} />
        </div>
      </Group>

      <Group title="Characters">
        {panel.bodies.length === 0 && <p class="m-0 text-sm text-muted-foreground">No one on stage.</p>}
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
                    <Button variant="ghost" size="icon-sm" aria-label="Move character left" disabled={j === 0} onClick={() => moveBody(index, j, -1)}><ChevronLeft /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Move character right" disabled={j === panel.bodies.length - 1} onClick={() => moveBody(index, j, 1)}><ChevronRight /></Button>
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
                      Remove{hasLine ? " (reassign lines)" : ""}
                    </Button>
                  </span>
                </div>
                <div class="flex flex-wrap items-start gap-4">
                  <EmotionWheel angle={body.emotion.angle} intensity={body.emotion.intensity} onChange={(angle, intensity) => updateBody(index, j, { emotion: { angle, intensity } })} />
                  <div class="flex min-w-40 flex-1 flex-col gap-2">
                    <span class="mono text-sm">{emotionName(body.emotion.angle, body.emotion.intensity)}</span>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <Label>angle</Label>
                        <Input type="number" step="0.01" min="0" max="6.2832" value={body.emotion.angle} aria-label="angle" onInput={(e) => updateBody(index, j, { emotion: { ...body.emotion, angle: Number((e.currentTarget as HTMLInputElement).value) || 0 } })} />
                      </div>
                      <div>
                        <Label>intensity</Label>
                        <Input type="number" step="0.05" min="0" max="1" value={body.emotion.intensity} aria-label="intensity" onInput={(e) => updateBody(index, j, { emotion: { ...body.emotion, intensity: Math.max(0, Math.min(1, Number((e.currentTarget as HTMLInputElement).value) || 0)) } })} />
                      </div>
                    </div>
                    <div>
                      <Label>Pose</Label>
                      <ToggleGroup type="single" class="mt-1" value={body.pose ?? "none"} onValueChange={(pose: (typeof POSES)[number]) => pose && updateBody(index, j, { pose: pose === "none" ? undefined : pose })} aria-label="Pose">
                        {POSES.map((pose) => (
                          <ToggleGroupItem key={pose} value={pose}>{pose}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    {!hasLine && (
                      <Checkbox label="Keep on stage (requested)" checked={!!body.requested} onChange={(e) => updateBody(index, j, { requested: (e.currentTarget as HTMLInputElement).checked || undefined })} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Popover open={picker} onOpenChange={setPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" class={DASHED} aria-label="+ Add character">
              <Plus /> Add character
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-[min(24rem,calc(100vw-2rem))]" aria-label="Choose a character">
            <div class="mb-2 flex items-center">
              <span class="caption">Choose a character</span>
              <PopoverClose asChild>
                <Button variant="ghost" size="icon-sm" class="ml-auto" aria-label="Close"><X /></Button>
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

      <Group title="Lines">
        {panel.speakers.length === 0 && <p class="m-0 text-sm text-muted-foreground">No balloons yet.</p>}
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {panel.speakers.map((line, k) => (
            <li key={k} class="pg-line flex flex-col gap-2 rounded-md border border-border p-3">
              <div class="flex flex-wrap items-end gap-2">
                <div class="min-w-28 flex-1">
                  <Label>Speaker</Label>
                  <Select value={line.speaker} onValueChange={(v: string) => updateLine(index, k, { speaker: v })}>
                    <SelectTrigger class="mt-1" aria-label="Speaker"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caption">caption</SelectItem>
                      {onStage.map((id) => (
                        <SelectItem key={id} value={id}>{id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div class="min-w-28 flex-1">
                  <Label>Balloon</Label>
                  <Select value={line.balloon} disabled={line.speaker === "caption"} onValueChange={(v: string) => updateLine(index, k, { balloon: v as any })}>
                    <SelectTrigger class="mt-1" aria-label="Balloon"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speech">speech</SelectItem>
                      <SelectItem value="thought">thought</SelectItem>
                      <SelectItem value="caption">caption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span class="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Move line up" disabled={k === 0} onClick={() => moveLine(index, k, -1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move line down" disabled={k === panel.speakers.length - 1} onClick={() => moveLine(index, k, 1)}><ArrowDown /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => removeLine(index, k)}><X /></Button>
                </span>
              </div>
              <Textarea rows={2} value={line.text} placeholder="What they say" aria-label="Text" onInput={(e) => updateLine(index, k, { text: (e.currentTarget as HTMLTextAreaElement).value })} />
              <span class="mono text-xs text-muted-foreground">{line.text.length} chars</span>
            </li>
          ))}
        </ul>
        <div class="grid grid-cols-2 gap-2">
          <AddButton label="Add line" onClick={() => addLine(index, onStage[0] ?? "caption")} />
          <AddButton label="Add caption" onClick={() => addLine(index, "caption")} />
        </div>
      </Group>

      <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4" role="group" aria-label={`Panel ${index + 1} actions`}>
        <Button variant="ghost" size="icon" aria-label="Move panel left" disabled={index === 0} onClick={() => movePanel(index, -1)}><ChevronLeft /></Button>
        <Button variant="ghost" size="icon" aria-label="Move panel right" disabled={index === total - 1} onClick={() => movePanel(index, 1)}><ChevronRight /></Button>
        <Button variant="ghost" onClick={() => duplicatePanel(index)}><Copy /> Duplicate</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="destructive" class="ml-auto" disabled={total === 1}><Trash2 /> Remove</Button>
          </PopoverTrigger>
          <PopoverContent align="end" class="w-60">
            <p class="mb-3 text-sm">Remove panel {index + 1}? Undo restores it.</p>
            <div class="flex justify-end gap-2">
              <PopoverClose asChild><Button variant="ghost" size="sm">Cancel</Button></PopoverClose>
              <PopoverClose asChild><Button variant="primary" size="sm" onClick={() => removePanel(index)}>Remove panel</Button></PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
