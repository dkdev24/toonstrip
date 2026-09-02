/** The WYSIWYG form (SITE_DEV_PLAN.md §6.3, DESIGN.md §6.2). */
import { useState } from "preact/hooks";
import type { Panel, CameraPreset } from "@toonstrip/schema";
import { EmotionWheel, emotionName } from "./EmotionWheel";
import {
  doc, selectedPanel, activeCharacters, activeBackdrops, roster, packs, togglePack,
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

export function PanelForm() {
  const d = doc.value;
  return (
    <div class="pg-form">
      <div class="pg-form__packs" role="group" aria-label="Asset packs">
        <span class="caption">Packs</span>
        {roster.value.packNames.map((name) => (
          <button key={name} type="button" class="chip" aria-pressed={packs.value.includes(name)} onClick={() => togglePack(name)}>
            {name}
          </button>
        ))}
      </div>
      <ol class="pg-panels">
        {d.panels.map((panel, i) => (
          <PanelCard key={i} panel={panel} index={i} total={d.panels.length} />
        ))}
      </ol>
      <button type="button" class="pg-add pg-add--panel" onClick={() => addPanel()}>
        + Add panel
      </button>
    </div>
  );
}

function PanelCard({ panel, index, total }: { panel: Panel; index: number; total: number }) {
  const selected = selectedPanel.value === index;
  const [showCharacters, setShowCharacters] = useState(false);
  const backdrops = activeBackdrops.value;
  const characters = activeCharacters.value;
  const onStage = panel.bodies.map((b) => b.character);

  return (
    <li class={`pg-panel${selected ? " is-selected" : ""}`} onFocusCapture={() => (selectedPanel.value = index)} onClick={() => (selectedPanel.value = index)}>
      <div class="pg-panel__head">
        <span class="pg-panel__title">
          Panel {index + 1}
          {selected && <span class="visually-hidden"> (selected)</span>}
        </span>
        <span class="pg-panel__actions">
          <button type="button" class="button button--ghost button--icon" aria-label="Move panel up" disabled={index === 0} onClick={() => movePanel(index, -1)}>▲</button>
          <button type="button" class="button button--ghost button--icon" aria-label="Move panel down" disabled={index === total - 1} onClick={() => movePanel(index, 1)}>▼</button>
          <button type="button" class="button button--ghost button--dense" onClick={() => duplicatePanel(index)}>Duplicate</button>
          <button type="button" class="button button--danger button--dense" onClick={() => removePanel(index)} disabled={total === 1}>Remove</button>
        </span>
      </div>

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
    </li>
  );
}
