/**
 * Resizable split panes with shadcn's component names and props subset.
 * react-resizable-panels is not used: under preact/compat its v4 layout engine
 * reports wrong sizes and neither drag nor keyboard resizing fires.
 *
 * <ResizablePanelGroup orientation="horizontal"|"vertical" defaultLayout={[60, 40]} onLayoutChange={fn}>
 *   <ResizablePanel minSize={25}>…</ResizablePanel>
 *   <ResizableHandle withHandle />
 *   <ResizablePanel minSize={25}>…</ResizablePanel>
 * </ResizablePanelGroup>
 *
 * Sizes are percentages of the group. Exactly two panels and one handle are
 * supported, which is all the playground shell needs. A 3-track CSS grid
 * (`var(--split) auto 1fr` — panel, handle, panel) does the sizing, so the
 * first panel's share is the only thing tracked; panels need no size or
 * index of their own.
 */
import { GripVertical } from "lucide-preact";
import { createContext, type ComponentChildren, type JSX } from "preact";
import { useContext, useRef, useState } from "preact/hooks";
import { cn } from "../../lib/utils";

interface GroupCtx {
  orientation: "horizontal" | "vertical";
  split: number;
  min: [number, number];
  registerMin: (v: number) => void;
  groupRef: { current: HTMLDivElement | null };
  resizeTo: (first: number) => void;
}

const Ctx = createContext<GroupCtx | null>(null);

interface GroupProps {
  orientation?: "horizontal" | "vertical";
  defaultLayout?: [number, number];
  onLayoutChange?: (layout: [number, number]) => void;
  class?: string;
  className?: string;
  children: ComponentChildren;
}

export function ResizablePanelGroup({ orientation = "horizontal", defaultLayout = [50, 50], onLayoutChange, className, children, ...rest }: GroupProps) {
  const [split, setSplit] = useState(defaultLayout[0]);
  const min = useRef<[number, number]>([10, 10]);
  const nextMin = useRef(0);
  nextMin.current = 0;
  const groupRef = useRef<HTMLDivElement | null>(null);

  const ctx: GroupCtx = {
    orientation,
    split,
    min: min.current,
    registerMin: (v) => {
      min.current[nextMin.current++ as 0 | 1] = v;
    },
    groupRef,
    resizeTo: (first) => {
      const lo = min.current[0];
      const hi = 100 - min.current[1];
      const a = Math.round(Math.min(hi, Math.max(lo, first)) * 100) / 100;
      setSplit(a);
      onLayoutChange?.([a, Math.round((100 - a) * 100) / 100]);
    },
  };

  const style = {
    "--split": `${split}%`,
    // Not the shared `.grid` utility class: it carries a 24px gap this needs
    // to be exactly 0, so display:grid is set here directly instead.
    display: "grid",
    gap: 0,
    // 3 tracks, not 2: the handle is a grid child too, sized to its own content.
    gridTemplateColumns: orientation === "horizontal" ? "var(--split) auto 1fr" : undefined,
    gridTemplateRows: orientation === "vertical" ? "var(--split) auto 1fr" : undefined,
  } as unknown as JSX.CSSProperties;

  return (
    <Ctx.Provider value={ctx}>
      <div ref={groupRef} data-orientation={orientation} style={style} class={cn("h-full w-full min-h-0 min-w-0", className, rest.class)}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

interface PanelProps {
  minSize?: number;
  class?: string;
  className?: string;
  children?: ComponentChildren;
}

export function ResizablePanel({ minSize = 10, className, children, ...rest }: PanelProps) {
  const ctx = useContext(Ctx)!;
  ctx.registerMin(minSize);
  return (
    <div data-panel="" class={cn("min-h-0 min-w-0 overflow-hidden", className, rest.class)}>
      {children}
    </div>
  );
}

interface HandleProps {
  withHandle?: boolean;
  class?: string;
  className?: string;
  "aria-label"?: string;
}

export function ResizableHandle({ withHandle, className, ...rest }: HandleProps) {
  const ctx = useContext(Ctx)!;
  const vertical = ctx.orientation === "vertical";
  const [active, setActive] = useState(false);

  const pct = (clientX: number, clientY: number) => {
    const r = ctx.groupRef.current?.getBoundingClientRect();
    if (!r) return ctx.split;
    return vertical ? ((clientY - r.top) / r.height) * 100 : ((clientX - r.left) / r.width) * 100;
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    const move = (ev: PointerEvent) => ctx.resizeTo(pct(ev.clientX, ev.clientY));
    const up = () => {
      setActive(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const dec = vertical ? "ArrowUp" : "ArrowLeft";
    const inc = vertical ? "ArrowDown" : "ArrowRight";
    let next: number | null = null;
    if (e.key === dec) next = ctx.split - step;
    else if (e.key === inc) next = ctx.split + step;
    else if (e.key === "Home") next = ctx.min[0];
    else if (e.key === "End") next = 100 - ctx.min[1];
    if (next === null) return;
    e.preventDefault();
    ctx.resizeTo(next);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={vertical ? "horizontal" : "vertical"}
      aria-valuenow={Math.round(ctx.split)}
      aria-valuemin={ctx.min[0]}
      aria-valuemax={100 - ctx.min[1]}
      aria-label={rest["aria-label"] ?? "Resize"}
      data-orientation={ctx.orientation}
      data-active={active || undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      class={cn(
        "group relative flex shrink-0 items-center justify-center bg-border outline-none transition-colors select-none touch-none",
        "hover:bg-border-strong data-[active]:bg-primary focus-visible:bg-primary",
        vertical ? "h-px w-full cursor-row-resize" : "w-px h-full cursor-col-resize",
        // widen the hit area without changing the visual line
        vertical
          ? "after:absolute after:inset-x-0 after:top-1/2 after:h-2 after:-translate-y-1/2"
          : "after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
        className,
        rest.class,
      )}
    >
      {withHandle && (
        <div class={cn("z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border bg-muted", vertical && "rotate-90")}>
          <GripVertical class="size-2.5" />
        </div>
      )}
    </div>
  );
}
