/** The WYSIWYG form (SITE_DEV_PLAN.md §6.3, DESIGN.md §6.2). */
import { useState } from "preact/hooks";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-preact";
import type { Panel, CameraPreset } from "@toonstrip/schema";
import { EmotionWheel, emotionName } from "./EmotionWheel";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "../ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import {
  doc, selectedPanel, stripTab, activeCharacters, activeBackdrops, roster, packs, togglePack, presets, loadPreset,
  addPanel, duplicatePanel, removePanel, movePanel, updatePanel,
  addBody, updateBody, removeBody, moveBody,
  addLine, updateLine, removeLine, moveLine,
  type RosterCharacter,
} from "../../lib/playground/state";

const CAMERAS: CameraPreset[] = ["establishing", "wide", "medium", "over-shoulder", "close-up", "reaction"];

function spriteStyle(c: RosterCharacter, size: number): string {
  const scale = Math.min(size / Math.max(c.thumb.width, c.thumb.height), 2);
  return [
    `width:${Math.round(c.thumb.width * scale)}px`,
    `height:${Math.round(c.thumb.height * scale)}px`,
    `background-image:url(${c.sheetUrl})`,
    `background-size:${Math.round(c.sheetWidth * scale)}px ${Math.round(c.sheetHeight * scale)}px`,
    `background-position:-${Math.round(c.thumb.x * scale)}px -${Math.round(c.thumb.y * scale)}px`,
    "background-repeat:no-repeat",
  ].join(";");
}

/**
 * Configure pane (PLAYGROUND_UI_PLAN.md §4): a Strip tab for document-level settings,
 * then one tab per panel. The active panel tab is the selected panel, which the
 * preview outlines and whose canvas, when clicked, opens the tab.
 */
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
          <PanelCard panel={panel} index={i} total={d.panels.length} />
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
      <div class="pg-form__packs" role="group" aria-label="Asset packs">
        <span class="caption">Packs</span>
        {roster.value.packNames.map((name) => (
          <button key={name} type="button" class="chip" aria-pressed={packs.value.includes(name)} onClick={() => togglePack(name)}>
            {name}
          </button>
        ))}
      </div>
      <div class="pg-field">
        <label class="pg-label" for="pg-preset">Load a preset</label>
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
        <p class="caption">Replaces the current strip. Undo with Ctrl/Cmd+Z.</p>
      </div>
      <dl class="mono grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt class="text-muted-foreground">panels</dt><dd>{d.panels.length}</dd>
        <dt class="text-muted-foreground">characters</dt><dd>{bodies.size === 0 ? "none" : [...bodies].join(", ")}</dd>
        <dt class="text-muted-foreground">lines</dt><dd>{d.panels.reduce((n, p) => n + p.speakers.length, 0)}</dd>
      </dl>
      {list[0] && (
        <Button class="self-start" onClick={() => loadPreset(list[0])}>Reset to the first preset</Button>
      )}
    </div>
  );
}

function PanelCard({ panel, index, total }: { panel: Panel; index: number; total: number }) {
  const [showCharacters, setShowCharacters] = useState(false);
  const backdrops = activeBackdrops.value;
  const characters = activeCharacters.value;
  const onStage = panel.bodies.map((b) => b.character);

  return (
    <div class="pg-panel-editor flex flex-col gap-4" aria-label={`Panel ${index + 1}`}>

      <fieldset class="pg-group">
        <legend class="caption">Scene</legend>
        <div class="pg-field">
          <span class="pg-label">Backdrop</span>
          <div class="pg-backdrops" role="radiogroup" aria-label="Backdrop">
            {backdrops.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={panel.backdrop === b.id}
                class={`pg-backdrop${panel.backdrop === b.id ? " is-selected" : ""}`}
                title={`${b.id} (${b.pack})`}
                onClick={() => updatePanel(index, { backdrop: b.id })}
              >
                <img src={b.url} alt="" width={64} height={54} loading="lazy" />
                <span class="mono">{b.id}</span>
              </button>
            ))}
          </div>
        </div>
        <div class="pg-field">
          <label class="pg-label" for={`camera-${index}`}>Camera</label>
          <div class="pg-segmented" role="radiogroup" id={`camera-${index}`} aria-label="Camera">
            {CAMERAS.map((cam) => (
              <button key={cam} type="button" role="radio" aria-checked={(panel.camera ?? "medium") === cam} onClick={() => updatePanel(index, { camera: cam })}>
                {cam}
              </button>
            ))}
          </div>
        </div>
        <div class="pg-row">
          <label class="pg-field pg-field--grow">
            <span class="pg-label">Room title</span>
            <input type="text" value={panel.roomTitle ?? ""} placeholder="none" onInput={(e) => updatePanel(index, { roomTitle: (e.currentTarget as HTMLInputElement).value || undefined })} />
          </label>
          <label class="pg-check">
            <input type="checkbox" checked={!!panel.dark} onChange={(e) => updatePanel(index, { dark: (e.currentTarget as HTMLInputElement).checked || undefined })} />
            Dark
          </label>
        </div>
      </fieldset>

      <fieldset class="pg-group">
        <legend class="caption">Characters</legend>
        {panel.bodies.length === 0 && <p class="pg-empty">No one on stage.</p>}
        <ul class="pg-bodies">
          {panel.bodies.map((body, j) => {
            const c = characters.find((x) => x.id === body.character);
            const hasLine = panel.speakers.some((l) => l.speaker === body.character);
            return (
              <li key={j} class="pg-body">
                <div class="pg-body__who">
                  {c && <span class="pg-sprite" style={spriteStyle(c, 40)} aria-hidden="true" />}
                  <span class="mono">{body.character}</span>
                  <span class="pg-body__actions">
                    <button type="button" class="button button--ghost button--icon" aria-label="Move character left" disabled={j === 0} onClick={() => moveBody(index, j, -1)}>◀</button>
                    <button type="button" class="button button--ghost button--icon" aria-label="Move character right" disabled={j === panel.bodies.length - 1} onClick={() => moveBody(index, j, 1)}>▶</button>
                    <button
                      type="button"
                      class="button button--ghost button--dense"
                      onClick={() => {
                        if (!hasLine) return removeBody(index, j);
                        const others = onStage.filter((id) => id !== body.character);
                        const target = others[0];
                        // Keyboard-safe: no confirm() dialogs; reassign to the first other body if any, else caption.
                        removeBody(index, j, target ?? "caption");
                      }}
                    >
                      Remove{hasLine ? " (reassign lines)" : ""}
                    </button>
                  </span>
                </div>
                <div class="pg-body__emotion">
                  <EmotionWheel angle={body.emotion.angle} intensity={body.emotion.intensity} onChange={(angle, intensity) => updateBody(index, j, { emotion: { angle, intensity } })} />
                  <div class="pg-body__numbers">
                    <span class="pg-emotion-name">{emotionName(body.emotion.angle, body.emotion.intensity)}</span>
                    <label>
                      <span class="pg-label">angle</span>
                      <input type="number" step="0.01" min="0" max="6.2832" value={body.emotion.angle} onInput={(e) => updateBody(index, j, { emotion: { ...body.emotion, angle: Number((e.currentTarget as HTMLInputElement).value) || 0 } })} />
                    </label>
                    <label>
                      <span class="pg-label">intensity</span>
                      <input type="number" step="0.05" min="0" max="1" value={body.emotion.intensity} onInput={(e) => updateBody(index, j, { emotion: { ...body.emotion, intensity: Math.max(0, Math.min(1, Number((e.currentTarget as HTMLInputElement).value) || 0)) } })} />
                    </label>
                    <div class="pg-segmented pg-segmented--small" role="radiogroup" aria-label="Pose">
                      {(["none", "wave", "point", "shrug"] as const).map((pose) => (
                        <button key={pose} type="button" role="radio" aria-checked={(body.pose ?? "none") === pose} onClick={() => updateBody(index, j, { pose: pose === "none" ? undefined : pose })}>
                          {pose}
                        </button>
                      ))}
                    </div>
                    {!hasLine && (
                      <label class="pg-check">
                        <input type="checkbox" checked={!!body.requested} onChange={(e) => updateBody(index, j, { requested: (e.currentTarget as HTMLInputElement).checked || undefined })} />
                        Keep on stage (requested)
                      </label>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" class="pg-add" aria-expanded={showCharacters} onClick={() => setShowCharacters(!showCharacters)}>
          + Add character
        </button>
        {showCharacters && (
          <div class="pg-picker" role="group" aria-label="Choose a character">
            {characters.map((c) => (
              <button
                key={`${c.pack}/${c.id}`}
                type="button"
                class="pg-picker__item"
                title={`${c.name} (${c.pack})`}
                onClick={() => {
                  addBody(index, c.id);
                  setShowCharacters(false);
                }}
              >
                <span class="pg-picker__thumb"><span class="pg-sprite" style={spriteStyle(c, 48)} aria-hidden="true" /></span>
                <span class="mono">{c.id}</span>
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset class="pg-group">
        <legend class="caption">Lines</legend>
        {panel.speakers.length === 0 && <p class="pg-empty">No balloons yet.</p>}
        <ul class="pg-lines">
          {panel.speakers.map((line, k) => (
            <li key={k} class="pg-line">
              <div class="pg-row">
                <label class="pg-field">
                  <span class="pg-label">Speaker</span>
                  <select value={line.speaker} onChange={(e) => updateLine(index, k, { speaker: (e.currentTarget as HTMLSelectElement).value })}>
                    <option value="caption">caption</option>
                    {onStage.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </label>
                <label class="pg-field">
                  <span class="pg-label">Balloon</span>
                  <select value={line.balloon} disabled={line.speaker === "caption"} onChange={(e) => updateLine(index, k, { balloon: (e.currentTarget as HTMLSelectElement).value as any })}>
                    <option value="speech">speech</option>
                    <option value="thought">thought</option>
                    <option value="caption">caption</option>
                  </select>
                </label>
                <span class="pg-line__actions">
                  <button type="button" class="button button--ghost button--icon" aria-label="Move line up" disabled={k === 0} onClick={() => moveLine(index, k, -1)}>▲</button>
                  <button type="button" class="button button--ghost button--icon" aria-label="Move line down" disabled={k === panel.speakers.length - 1} onClick={() => moveLine(index, k, 1)}>▼</button>
                  <button type="button" class="button button--ghost button--icon" aria-label="Remove line" onClick={() => removeLine(index, k)}>✕</button>
                </span>
              </div>
              <label class="pg-field">
                <span class="visually-hidden">Text</span>
                <textarea rows={2} value={line.text} placeholder="What they say" onInput={(e) => updateLine(index, k, { text: (e.currentTarget as HTMLTextAreaElement).value })} />
              </label>
              <span class="pg-count">{line.text.length} chars</span>
            </li>
          ))}
        </ul>
        <div class="pg-row">
          <button type="button" class="pg-add" onClick={() => addLine(index, onStage[0] ?? "caption")}>
            + Add line
          </button>
          <button type="button" class="pg-add" onClick={() => addLine(index, "caption")}>
            + Add caption
          </button>
        </div>
      </fieldset>

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
