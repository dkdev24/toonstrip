/** shadcn/ui Input and Textarea on plain elements (forwardRef for asChild/label use). */
import type { ComponentProps } from "preact";
import { forwardRef } from "preact/compat";
import { cn } from "../../lib/utils";

const base =
  "w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, class: cls, type = "text", ...props }, ref) {
  return <input ref={ref} type={type} className={cn(base, "h-9", type === "number" && "font-mono tabular-nums", className, cls)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, class: cls, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-16 resize-y py-2 leading-snug field-sizing-content", className, cls)} {...props} />;
});

export function Label({ className, class: cls, ...props }: ComponentProps<"label">) {
  return <label className={cn("caption block", className, cls)} {...props} />;
}

export function Checkbox({ className, class: cls, label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label class={cn("inline-flex h-9 cursor-pointer items-center gap-2 text-sm", className, cls)}>
      <input type="checkbox" class="size-4 accent-primary" {...props} />
      {label}
    </label>
  );
}
