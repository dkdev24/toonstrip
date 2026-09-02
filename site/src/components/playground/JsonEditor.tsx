/** CodeMirror 6 JSON editor bound to the shared document (SITE_DEV_PLAN.md §6.2, DESIGN.md §6.3). */
import { useEffect, useRef } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { syntaxHighlighting, HighlightStyle, bracketMatching } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Site-token colours so both themes pass AA (CodeMirror's default style is light-only).
const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--ink)" },
  { tag: tags.string, color: "var(--link)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--warn)" },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: "var(--ink-2)" },
]);
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { jsonText, jsonProblems, lastSource, applyJson, doc, pretty, setDoc } from "../../lib/playground/state";

export function JsonEditor() {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const state = EditorState.create({
      doc: jsonText.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        json(),
        syntaxHighlighting(highlight),
        lintGutter(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": "JSON document" }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const text = update.state.doc.toString();
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => applyJson(text), 150);
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current! });
    return () => view.current?.destroy();
  }, []);

  // Form/load edits regenerate the text; editor edits do not (no reformat under the cursor).
  useSignalEffect(() => {
    const text = jsonText.value;
    const source = lastSource.value;
    const v = view.current;
    if (!v || source === "editor") return;
    if (v.state.doc.toString() !== text) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
    }
  });

  // Validation problems → lint markers.
  useSignalEffect(() => {
    const problems = jsonProblems.value;
    const v = view.current;
    if (!v) return;
    const diagnostics: Diagnostic[] = problems.map((p) => {
      const line = p.line && p.line <= v.state.doc.lines ? v.state.doc.line(p.line) : v.state.doc.line(1);
      return { from: line.from, to: line.to, severity: "error", message: p.message };
    });
    v.dispatch(setDiagnostics(v.state, diagnostics));
  });

  const problems = jsonProblems.value;
  return (
    <div class="pg-editor">
      <div class="pg-pane__bar">
        <span class="caption">JSON</span>
        <span class={`pg-status ${problems.length ? "is-invalid" : "is-valid"}`} role="status">
          {problems.length ? `${problems.length} problem${problems.length === 1 ? "" : "s"}` : "Valid"}
        </span>
        <span class="pg-pane__actions">
          <button type="button" class="button button--ghost button--dense" onClick={() => setDoc(doc.value, "form")}>Format</button>
          <button
            type="button"
            class="button button--ghost button--dense"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(pretty(doc.value));
              } catch {}
            }}
          >
            Copy
          </button>
        </span>
      </div>
      <div class="pg-editor__host" ref={host} />
      {problems.length > 0 && (
        <ul class="pg-problems">
          {problems.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  const v = view.current;
                  if (!v || !p.line) return;
                  const line = v.state.doc.line(Math.min(p.line, v.state.doc.lines));
                  v.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
                  v.focus();
                }}
              >
                {p.line ? `Line ${p.line}: ` : ""}
                {p.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
