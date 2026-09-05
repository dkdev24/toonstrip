/** shadcn/ui Button on preact/compat, variants mapped to DESIGN.md §4 buttons. */
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "preact";
import { forwardRef } from "preact/compat";
import { cn } from "../../lib/utils";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANT: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:brightness-95",
  secondary: "border border-border-strong bg-transparent text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  destructive: "text-destructive hover:bg-destructive/10",
};

const SIZE: Record<string, string> = {
  dense: "h-9 px-3",
  sm: "h-8 px-2.5 text-xs",
  icon: "size-9",
  "icon-sm": "size-7",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  asChild?: boolean;
};

// forwardRef is required under Preact: Radix triggers with `asChild` pass a ref
// through Slot, and a plain function component would receive it as its instance.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { class: cls, variant = "secondary", size = "dense", asChild = false, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? (Slot as any) : "button";
  return <Comp ref={ref} type={asChild ? undefined : type} className={cn(BASE, VARIANT[variant], SIZE[size], cls)} {...props} />;
});
