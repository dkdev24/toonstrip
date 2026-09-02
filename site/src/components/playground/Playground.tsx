/** Playground root: three panes over one document; tabs below 900 px. */
import { useEffect, useState } from "preact/hooks";
import { boot, toast, undo, redo, type Roster, type Preset } from "../../lib/playground/state";
import { PanelForm } from "./PanelForm";
import { JsonEditor } from "./JsonEditor";
import { Preview } from "./Preview";

interface Props {
  roster: Roster;
  presets: Preset[];
}

type Tab = "form" | "json" | "preview";

export default function Playground({ roster, presets }: Props) {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("form");
  const [jsonOpen, setJsonOpen] = useState(true);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    boot(roster, presets);
    setReady(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".cm-editor, input, textarea, select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready) return <p class="pg-loading">Loading the playground…</p>;

  return (
    <div class="pg" data-tab={tab}>
      <div class="pg-tabs">
        <div role="tablist" aria-label="Playground panes" class="pg-tabs__list">
          {(["form", "json", "preview"] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} class="chip" onClick={() => setTab(t)}>
              {t === "form" ? "Form" : t === "json" ? "JSON" : "Preview"}
            </button>
          ))}
        </div>
        <button type="button" class="button button--secondary button--dense pg-tabs__peek" onClick={() => setSheet(true)}>
          Preview
        </button>
      </div>

      <div class="pg-left">
        <section class={`pg-pane pg-pane--form${tab === "form" ? " is-active" : ""}`} aria-label="Form">
          <div class="pg-pane__scroll">
            <PanelForm />
          </div>
        </section>
        <section class={`pg-pane pg-pane--json${tab === "json" ? " is-active" : ""}${jsonOpen ? "" : " is-collapsed"}`} aria-label="JSON">
          <button type="button" class="pg-pane__toggle" aria-expanded={jsonOpen} onClick={() => setJsonOpen(!jsonOpen)}>
            {jsonOpen ? "Collapse JSON" : "Expand JSON"}
          </button>
          {jsonOpen && <JsonEditor />}
        </section>
      </div>

      <section class={`pg-pane pg-pane--preview${tab === "preview" ? " is-active" : ""}${sheet ? " is-sheet" : ""}`} aria-label="Preview">
        {sheet && (
          <button type="button" class="button button--ghost button--dense pg-sheet__close" onClick={() => setSheet(false)}>
            Close preview
          </button>
        )}
        <Preview />
      </section>

      {toast.value && (
        <div class="toast" role="status">
          {toast.value}
        </div>
      )}
    </div>
  );
}
