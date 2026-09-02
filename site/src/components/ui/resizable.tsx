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
 * supported, which is all the playground shell needs.
 */
import { GripVertical } from "lucide-preact";
import { createContext, type ComponentChildren, type JSX } from "preact";
import { useContext, useRef, useState } from "preact/hooks";
import { cn } from "../../lib/utils";

interface GroupCtx {
  orientation: "horizontal" | "vertical";
  sizes: [number, number];
  min: [number, number];
  setMin: (i: 0 | 1, v: number) => void;
  register: () => 0 | 1;
  resizeTo: (first: number) => void;
  groupRef: { current: HTMLDivElement | null };
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
  const [sizes, setSizes] = useState<[number, number]>(defaultLayout);
  const min = useRef<[number, number]>([10, 10]);
  const count = useRef(0);
  const groupRef = useRef<HTMLDivElement | null>(null);
  count.current = 0;
  const ctx: GroupCtx = {
    orientation,
    sizes,
    min: min.current,
    setMin: (i, v) => (min.current[i] = v),
    register: () => (count.current++ === 0 ? 0 : 1),
    groupRef,
    resizeTo: (first) => {
      const lo = min.current[0];
      const hi = 100 - min.current[1];
      const a = Math.round(Math.min(hi, Math.max(lo, first)) * 100) / 100;
      const next: [number, number] = [a, Math.round((100 - a) * 100) / 100];
      setSizes(next);
      onLayoutChange?.(next);
    },
  };
  return (
    <Ctx.Provider value={ctx}>
      <div
        ref={groupRef}
        data-orientation={orientation}
        class={cn("flex h-full w-full min-h-0 min-w-0", orientation === "vertical" && "flex-col", className, rest.class)}
      >
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
  const i = ctx.register();
  ctx.setMin(i, minSize);
  const size = ctx.sizes[i];
  const style: JSX.CSSProperties = { flex: `0 0 ${size}%`, minWidth: 0, minHeight: 0 };
  return (
    <div data-panel="" data-panel-size={size} style={style} class={cn("min-h-0 min-w-0 overflow-hidden", className, rest.class)}>
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
    if (!r) return ctx.sizes[0];
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
    if (e.key === dec) next = ctx.sizes[0] - step;
    else if (e.key === inc) next = ctx.sizes[0] + step;
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
      aria-valuenow={Math.round(ctx.sizes[0])}
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
