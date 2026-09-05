/** shadcn/ui DropdownMenu (Radix) on preact/compat. */
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-preact";
import { cn } from "../../lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root as any;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger as any;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group as any;

export function DropdownMenuContent({ class: cls, sideOffset = 4, align = "end", ...props }: any) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
        cls,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ class: cls, variant = "default", ...props }: any) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4",
        variant === "destructive" && "text-destructive focus:bg-destructive/10 focus:text-destructive",
      cls,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ class: cls, children, checked, ...props }: any) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      cls,
      )}
      {...props}
    >
      <span class="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check class="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({ class: cls, ...props }: any) {
  return <DropdownMenuPrimitive.Label className={cn("px-2 py-1.5 text-xs text-muted-foreground", cls)} {...props} />;
}

export function DropdownMenuSeparator({ class: cls, ...props }: any) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", cls)} {...props} />;
}
