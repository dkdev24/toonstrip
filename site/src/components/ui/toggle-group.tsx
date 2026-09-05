/** shadcn/ui ToggleGroup (Radix) on preact/compat. Used for camera and pose segments. */
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../../lib/utils";

export function ToggleGroup({ class: cls, ...props }: any) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn("inline-flex w-fit items-center gap-0.5 rounded-md border border-border bg-card p-0.5", cls)}
      {...props}
    />
  );
}

export function ToggleGroupItem({ class: cls, ...props }: any) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-sm px-2 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors",
        "bg-card hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:size-4",
      cls,
      )}
      {...props}
    />
  );
}
