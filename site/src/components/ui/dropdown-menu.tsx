/** shadcn/ui DropdownMenu (Radix) on preact/compat. */
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-preact";
import { cn } from "../../lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root as any;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger as any;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group as any;

export function DropdownMenuContent({ className, class: cls, sideOffset = 4, align = "end", ...props }: any) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
          className,
        cls,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, class: cls, variant = "default", ...props }: any) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4",
        variant === "destructive" && "text-destructive focus:bg-destructive/10 focus:text-destructive",
        className,
      cls,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, class: cls, children, checked, ...props }: any) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
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

export function DropdownMenuLabel({ className, class: cls, ...props }: any) {
  return <DropdownMenuPrimitive.Label className={cn("px-2 py-1.5 text-xs text-muted-foreground", className, cls)} {...props} />;
}

export function DropdownMenuSeparator({ className, class: cls, ...props }: any) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className, cls)} {...props} />;
}
