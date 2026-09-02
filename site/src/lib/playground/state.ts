/**
 * Playground state (SITE_DEV_PLAN.md §6.2): one document, three views.
 * `doc` is the single source of truth. Form edits write typed values into it;
 * the JSON editor parses on a debounce and only replaces `doc` when the text
 * validates, so the preview never goes blank. A `source` tag on each change
 * lets the editor avoid reformatting under the visitor's cursor.
 */
import { signal, computed, batch } from "@preact/signals";
import { validateDocument, ComicStripValidationError, type ComicStripDocument, type Panel, type Body, type Line } from "@toonstrip/schema";
import { lineForPath } from "./json-position";
import { decodeShareHash, encodeShareHash, DEFAULT_PACKS } from "../share";

export type Doc = ComicStripDocument;
export type Source = "form" | "editor" | "load";

export interface JsonProblem {
  line: number | null;
  message: string;
}

export interface Preset {
  name: string;
  doc: Doc;
  packs: string[];
}

export interface RosterCharacter {
  id: string;
  name: string;
  pack: string;
  sheetUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  thumb: { x: number; y: number; width: number; height: number };
}

export interface RosterBackdrop {
  id: string;
  pack: string;
  url: string;
  width: number;
  height: number;
}

export interface Roster {
  characters: RosterCharacter[];
  backdrops: RosterBackdrop[];
  packNames: string[];
}

const AUTOSAVE_KEY = "toonstrip-playground";
const HISTORY_LIMIT = 50;

export const doc = signal<Doc>({ version: 1, panels: [] });
export const packs = signal<string[]>([...DEFAULT_PACKS]);
export const selectedPanel = signal(0);
export const jsonText = signal("");
export const jsonProblems = signal<JsonProblem[]>([]);
export const lastSource = signal<Source>("load");
export const roster = signal<Roster>({ characters: [], backdrops: [], packNames: [] });
export const presets = signal<Preset[]>([]);
export const toast = signal<string | null>(null);

const past: Doc[] = [];
const future: Doc[] = [];
export const canUndo = signal(false);
export const canRedo = signal(false);

export const activeCharacters = computed(() => roster.value.characters.filter((c) => packs.value.includes(c.pack)));
export const activeBackdrops = computed(() => roster.value.backdrops.filter((b) => packs.value.includes(b.pack)));
export const packUrls = computed(() => packs.value.map((name) => `/_toonstrip/${name}/`));
export const shareHash = computed(() => encodeShareHash(doc.value, packs.value));

export function pretty(d: Doc): string {
  return JSON.stringify(d, null, 2);
}

function pushHistory(previous: Doc) {
  past.push(previous);
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
  canUndo.value = past.length > 0;
  canRedo.value = false;
}

/** Replace the document. Every mutation goes through here. */
export function setDoc(next: Doc, source: Source, options: { history?: boolean } = {}) {
  batch(() => {
    if (options.history !== false) pushHistory(doc.value);
    doc.value = next;
    lastSource.value = source;
    if (source !== "editor") {
      jsonText.value = pretty(next);
      jsonProblems.value = [];
    }
    if (selectedPanel.value >= next.panels.length) selectedPanel.value = Math.max(0, next.panels.length - 1);
  });
  autosave();
}

export function undo() {
  const previous = past.pop();
  if (!previous) return;
  future.push(doc.value);
  batch(() => {
    doc.value = previous;
    lastSource.value = "form";
    jsonText.value = pretty(previous);
    jsonProblems.value = [];
    canUndo.value = past.length > 0;
    canRedo.value = true;
  });
  autosave();
}

export function redo() {
  const next = future.pop();
  if (!next) return;
  past.push(doc.value);
  batch(() => {
    doc.value = next;
    lastSource.value = "form";
    jsonText.value = pretty(next);
    jsonProblems.value = [];
    canUndo.value = true;
    canRedo.value = future.length > 0;
  });
  autosave();
}

/** The JSON editor's path in: parse, validate, and only then replace `doc`. */
export function applyJson(text: string) {
  jsonText.value = text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const m = /position (\d+)/.exec(String(err));
    const line = m ? text.slice(0, Number(m[1])).split("\n").length : null;
    jsonProblems.value = [{ line, message: (err as Error).message.replace(/^JSON\.parse: /, "") }];
    return;
  }
  try {
    const valid = validateDocument(parsed);
    jsonProblems.value = [];
    if (pretty(valid) !== pretty(doc.value)) setDoc(valid, "editor");
  } catch (err) {
    if (err instanceof ComicStripValidationError) {
      jsonProblems.value = err.issues.map((issue) => ({
        line: lineForPath(text, issue.instancePath),
        message: `${issue.instancePath || "/"} ${issue.message ?? "is invalid"}`,
      }));
    } else {
      jsonProblems.value = [{ line: null, message: String(err) }];
    }
  }
}

// ---- Panel / body / line mutators (form path) ----

function withPanels(fn: (panels: Panel[]) => Panel[]) {
  setDoc({ ...doc.value, panels: fn(doc.value.panels.map((p) => ({ ...p, bodies: [...p.bodies], speakers: [...p.speakers] }))) }, "form");
}

export function updatePanel(i: number, patch: Partial<Panel>) {
  withPanels((panels) => {
    const next = { ...panels[i], ...patch };
    // Drop undefined optionals so the JSON stays clean.
    for (const key of Object.keys(next) as (keyof Panel)[]) if (next[key] === undefined) delete next[key];
    panels[i] = next;
    return panels;
  });
}

export function addPanel(after = doc.value.panels.length - 1) {
  const template = doc.value.panels[after];
  const fresh: Panel = {
    backdrop: template?.backdrop ?? activeBackdrops.value[0]?.id ?? "field",
    camera: "medium",
    bodies: template ? template.bodies.map((b) => ({ ...b })) : [],
    speakers: [],
  };
  withPanels((panels) => {
    panels.splice(after + 1, 0, fresh);
    return panels;
  });
  selectedPanel.value = after + 1;
}

export function duplicatePanel(i: number) {
  withPanels((panels) => {
    panels.splice(i + 1, 0, JSON.parse(JSON.stringify(panels[i])));
    return panels;
  });
  selectedPanel.value = i + 1;
}

export function removePanel(i: number) {
  withPanels((panels) => {
    panels.splice(i, 1);
    return panels;
  });
}

export function movePanel(i: number, delta: number) {
  const j = i + delta;
  if (j < 0 || j >= doc.value.panels.length) return;
  withPanels((panels) => {
    const [p] = panels.splice(i, 1);
    panels.splice(j, 0, p);
    return panels;
  });
  selectedPanel.value = j;
}

export function addBody(i: number, character: string) {
  withPanels((panels) => {
    panels[i].bodies.push({ character, emotion: { angle: 0, intensity: 0.5 } });
    return panels;
  });
}

export function updateBody(i: number, j: number, patch: Partial<Body>) {
  withPanels((panels) => {
    const next = { ...panels[i].bodies[j], ...patch };
    for (const key of Object.keys(next) as (keyof Body)[]) if (next[key] === undefined) delete next[key];
    panels[i].bodies[j] = next;
    return panels;
  });
}

/** Remove a body; its lines are removed too (the form offers to reassign first). */
export function removeBody(i: number, j: number, reassignTo?: string) {
  withPanels((panels) => {
    const [gone] = panels[i].bodies.splice(j, 1);
    panels[i].speakers = panels[i].speakers
      .map((l) => (l.speaker === gone.character && reassignTo ? { ...l, speaker: reassignTo } : l))
      .filter((l) => l.speaker !== gone.character);
    return panels;
  });
}

export function moveBody(i: number, j: number, delta: number) {
  const k = j + delta;
  if (k < 0 || k >= doc.value.panels[i].bodies.length) return;
  withPanels((panels) => {
    const [b] = panels[i].bodies.splice(j, 1);
    panels[i].bodies.splice(k, 0, b);
    return panels;
  });
}

export function addLine(i: number, speaker: string) {
  withPanels((panels) => {
    const balloon: Line["balloon"] = speaker === "caption" ? "caption" : "speech";
    panels[i].speakers.push({ speaker, balloon, text: "" });
    return panels;
  });
}

export function updateLine(i: number, k: number, patch: Partial<Line>) {
  withPanels((panels) => {
    const next = { ...panels[i].speakers[k], ...patch };
    if (next.speaker === "caption") next.balloon = "caption";
    else if (next.balloon === "caption") next.balloon = "speech";
    panels[i].speakers[k] = next;
    return panels;
  });
}

export function removeLine(i: number, k: number) {
  withPanels((panels) => {
    panels[i].speakers.splice(k, 1);
    return panels;
  });
}

export function moveLine(i: number, k: number, delta: number) {
  const m = k + delta;
  if (m < 0 || m >= doc.value.panels[i].speakers.length) return;
  withPanels((panels) => {
    const [l] = panels[i].speakers.splice(k, 1);
    panels[i].speakers.splice(m, 0, l);
    return panels;
  });
}

export function togglePack(name: string) {
  const next = packs.value.includes(name) ? packs.value.filter((p) => p !== name) : [...packs.value, name];
  if (next.length === 0) return;
  packs.value = next;
  autosave();
}

export function loadPreset(preset: Preset) {
  batch(() => {
    packs.value = [...preset.packs];
    selectedPanel.value = 0;
  });
  setDoc(JSON.parse(JSON.stringify(preset.doc)), "load");
}

// ---- Persistence ----

function autosave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ doc: doc.value, packs: packs.value }));
  } catch {}
}

/** Boot order: URL hash, then autosave, then the first preset. */
export function boot(initialRoster: Roster, initialPresets: Preset[]) {
  roster.value = initialRoster;
  presets.value = initialPresets;
  const fromHash = decodeShareHash(location.hash);
  if (fromHash) {
    try {
      const valid = validateDocument(fromHash.doc);
      packs.value = fromHash.packs.filter((p) => initialRoster.packNames.includes(p));
      if (packs.value.length === 0) packs.value = [...DEFAULT_PACKS];
      setDoc(valid, "load", { history: false });
      history.replaceState(null, "", location.pathname);
      return;
    } catch {
      toast.value = "The shared link didn't contain a valid strip; loaded the default instead.";
    }
  }
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { doc: unknown; packs: string[] };
      const valid = validateDocument(parsed.doc);
      packs.value = parsed.packs.filter((p) => initialRoster.packNames.includes(p));
      if (packs.value.length === 0) packs.value = [...DEFAULT_PACKS];
      setDoc(valid, "load", { history: false });
      return;
    }
  } catch {}
  if (initialPresets[0]) {
    packs.value = [...initialPresets[0].packs];
    setDoc(JSON.parse(JSON.stringify(initialPresets[0].doc)), "load", { history: false });
  }
}

export function showToast(message: string) {
  toast.value = message;
  setTimeout(() => {
    if (toast.value === message) toast.value = null;
  }, 3000);
}
