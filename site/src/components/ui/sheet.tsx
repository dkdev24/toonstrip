/** shadcn/ui Sheet (Radix Dialog) on preact/compat. Bottom sheet only — the mobile preview's one use case. */
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-preact";
import { cn } from "../../lib/utils";

export const Sheet = SheetPrimitive.Root as any;

export function SheetContent({ class: cls, children, title, ...props }: any) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-background shadow-md outline-none",
          "inset-x-0 bottom-0 h-[55dvh] rounded-t-lg border-t border-border",
        cls,
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
