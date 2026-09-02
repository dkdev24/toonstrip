/** shadcn/ui Sheet (Radix Dialog) on preact/compat. The mobile preview uses side="bottom". */
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-preact";
import { cn } from "../../lib/utils";

export const Sheet = SheetPrimitive.Root as any;
export const SheetTrigger = SheetPrimitive.Trigger as any;
export const SheetClose = SheetPrimitive.Close as any;

export function SheetContent({ className, children, side = "bottom", title, ...props }: any) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-background shadow-md outline-none",
          side === "bottom" && "inset-x-0 bottom-0 h-[55dvh] rounded-t-lg border-t border-border",
          side === "top" && "inset-x-0 top-0 h-auto border-b border-border",
          side === "right" && "inset-y-0 right-0 w-3/4 max-w-sm border-l border-border",
          side === "left" && "inset-y-0 left-0 w-3/4 max-w-sm border-r border-border",
          className,
        )}
        {...props}
      >
        <SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>
        <SheetPrimitive.Description className="sr-only">{title}</SheetPrimitive.Description>
        {children}
        <SheetPrimitive.Close
          className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close preview"
        >
          <X class="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
