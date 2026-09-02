/** shadcn/ui Popover (Radix) on preact/compat. */
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../lib/utils";

export const Popover = PopoverPrimitive.Root as any;
export const PopoverTrigger = PopoverPrimitive.Trigger as any;
export const PopoverAnchor = PopoverPrimitive.Anchor as any;
export const PopoverClose = PopoverPrimitive.Close as any;

export function PopoverContent({ className, align = "start", sideOffset = 4, ...props }: any) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
