/**
 * Playground root (PLAYGROUND_UI_PLAN.md §3): one document, three panes.
 * Desktop (≥ 900 px): Configure | JSON on top, Preview full-width below, both splits
 * draggable and persisted. Narrow: Configure / JSON / Preview tabs plus a bottom-sheet
 * preview. No page scroll; each pane scrolls itself.
 */
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ChevronsLeft, ChevronsRight } from "lucide-preact";
import { boot, toast, undo, redo, type Roster, type Preset } from "../../lib/playground/state";
import { PanelForm } from "./PanelForm";
import { JsonEditor } from "./JsonEditor";
import { Preview } from "./Preview";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import { Sheet, SheetContent } from "../ui/sheet";
import { TooltipProvider } from "../ui/tooltip";

interface Props {
  roster: Roster;
  presets: Preset[];
}

type Tab = "configure" | "json" | "preview";
type Layout = [number, number];

const DESKTOP = "(min-width: 900px)";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/** localStorage-backed state; every access is guarded so a blocked store is harmless. */
function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
  return [value, set];
}

function PaneBar({ title, children }: { title: string; children?: ComponentChildren }) {
  return (
    <div class="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-muted pr-2 pl-4">
      <span class="caption">{title}</span>
      <span class="ml-auto flex items-center gap-1">{children}</span>
    </div>
  );
}

export default function Playground({ roster, presets }: Props) {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("configure");
  const [sheet, setSheet] = useState(false);
  const [jsonOpen, setJsonOpen] = usePersisted<boolean>("pg-json-open", true);
  const [vLayout, setVLayout] = usePersisted<Layout>("pg-split-v", [60, 40]);
  const [hLayout, setHLayout] = usePersisted<Layout>("pg-split-h", [50, 50]);
  const desktop = useMediaQuery(DESKTOP);

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

  const configurePane = (
    <section aria-label="Configure" class="flex h-full min-h-0 flex-col">
      <PaneBar title="Configure" />
      <div class="relative min-h-0 flex-1 overflow-auto p-4">
        <PanelForm />
      </div>
    </section>
  );

  const jsonPane = (
    <section aria-label="JSON" class="flex h-full min-h-0 flex-col">
      <JsonEditor
        actions={
          desktop && (
            <Button variant="ghost" size="icon-sm" aria-label="Collapse JSON" onClick={() => setJsonOpen(false)}>
              <ChevronsRight />
            </Button>
          )
        }
      />
    </section>
  );

  const previewPane = (
    <section aria-label="Preview" class="flex h-full min-h-0 flex-col">
      <Preview />
    </section>
  );

  const shell = "pg relative flex min-h-0 flex-col overflow-hidden h-[calc(100dvh-var(--header-height))]";

  if (desktop) {
    return (
      <TooltipProvider>
        <div class={shell}>
          <ResizablePanelGroup orientation="vertical" defaultLayout={vLayout} onLayoutChange={setVLayout}>
            <ResizablePanel minSize={30}>
              {jsonOpen ? (
                <ResizablePanelGroup orientation="horizontal" defaultLayout={hLayout} onLayoutChange={setHLayout}>
                  <ResizablePanel minSize={25}>{configurePane}</ResizablePanel>
                  <ResizableHandle withHandle aria-label="Resize Configure and JSON" />
                  <ResizablePanel minSize={25}>{jsonPane}</ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div class="flex h-full min-h-0">
                  <div class="min-w-0 flex-1">{configurePane}</div>
                  <button
                    type="button"
                    class="flex w-9 shrink-0 flex-col items-center gap-2 border-l border-border bg-muted pt-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
                    aria-label="Expand JSON"
                    onClick={() => setJsonOpen(true)}
                  >
                    <ChevronsLeft class="size-4" />
                    <span class="caption [writing-mode:vertical-rl]">JSON</span>
                  </button>
                </div>
              )}
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Resize editor and preview" />
            <ResizablePanel minSize={25}>{previewPane}</ResizablePanel>
          </ResizablePanelGroup>
          {toast.value && (
            <div class="toast" role="status">
              {toast.value}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tabs value={tab} onValueChange={(v: Tab) => setTab(v)} class={`${shell} gap-0`}>
        <div class="flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-2">
          <TabsList aria-label="Playground panes">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          {tab !== "preview" && (
            <Button class="ml-auto" onClick={() => setSheet(true)}>
              Preview
            </Button>
          )}
        </div>
        <TabsContent value="configure" class="min-h-0 flex-1">
          {configurePane}
        </TabsContent>
        <TabsContent value="json" class="min-h-0 flex-1">
          {jsonPane}
        </TabsContent>
        <TabsContent value="preview" class="min-h-0 flex-1">
          {previewPane}
        </TabsContent>
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent title="Preview" class="pt-8">
            {previewPane}
          </SheetContent>
        </Sheet>
        {toast.value && (
          <div class="toast" role="status">
            {toast.value}
          </div>
        )}
      </Tabs>
    </TooltipProvider>
  );
}
