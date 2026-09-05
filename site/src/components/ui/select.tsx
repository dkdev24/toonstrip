/** shadcn/ui Select (Radix) on preact/compat. */
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-preact";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root as any;
export const SelectGroup = SelectPrimitive.Group as any;
export const SelectValue = SelectPrimitive.Value as any;

export function SelectTrigger({ class: cls, children, ...props }: any) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm whitespace-nowrap text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate",
      cls,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown class="size-4 shrink-0 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ class: cls, children, position = "popper", ...props }: any) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-32 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1 w-full min-w-(--radix-select-trigger-width)",
        cls,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center">
          <ChevronUp class="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center">
          <ChevronDown class="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ class: cls, ...props }: any) {
  return <SelectPrimitive.Label className={cn("px-2 py-1.5 text-xs text-muted-foreground", cls)} {...props} />;
}

export function SelectItem({ class: cls, children, ...props }: any) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      cls,
      )}
      {...props}
    >
      <span class="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check class="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ class: cls, ...props }: any) {
  return <SelectPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", cls)} {...props} />;
}
