/** shadcn/ui Tooltip (Radix) on preact/compat. */
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider as any;
export const Tooltip = TooltipPrimitive.Root as any;
export const TooltipTrigger = TooltipPrimitive.Trigger as any;

export function TooltipContent({ class: cls, sideOffset = 4, children, ...props }: any) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit max-w-64 rounded-sm bg-foreground px-2 py-1 text-xs text-background shadow-md",
        cls,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
