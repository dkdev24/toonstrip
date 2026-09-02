/** shadcn/ui Tabs (Radix) on preact/compat. */
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export function Tabs({ className, ...props }: any) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function TabsList({ className, ...props }: any) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: any) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border border-transparent px-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none",
        "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: any) {
  return <TabsPrimitive.Content className={cn("flex-1 outline-none", className)} {...props} />;
}
