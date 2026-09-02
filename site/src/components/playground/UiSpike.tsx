/** Step-1 spike (PLAYGROUND_UI_PLAN.md §5): shadcn on preact/compat, on the kitchen sink. */
import { useState } from "preact/hooks";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Slider } from "../ui/slider";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Sheet, SheetTrigger, SheetContent } from "../ui/sheet";
import { ScrollArea } from "../ui/scroll-area";

export default function UiSpike() {
  const [camera, setCamera] = useState("medium");
  const [width, setWidth] = useState([640]);
  return (
    <TooltipProvider>
      <div class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" data-spike>
        <div class="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Remove</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip on compat</TooltipContent>
          </Tooltip>
        </div>

        <Tabs defaultValue="p1">
          <TabsList>
            <TabsTrigger value="strip">Strip</TabsTrigger>
            <TabsTrigger value="p1">1</TabsTrigger>
            <TabsTrigger value="p2">2</TabsTrigger>
          </TabsList>
          <TabsContent value="strip">Strip settings</TabsContent>
          <TabsContent value="p1">Panel 1</TabsContent>
          <TabsContent value="p2">Panel 2</TabsContent>
        </Tabs>

        <div class="flex flex-wrap items-center gap-3">
          <Select defaultValue="say">
            <SelectTrigger class="w-40" aria-label="Balloon">
              <SelectValue placeholder="Balloon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="say">say</SelectItem>
              <SelectItem value="think">think</SelectItem>
              <SelectItem value="shout">shout</SelectItem>
              <SelectItem value="caption">caption</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={camera} onValueChange={(v: string) => v && setCamera(v)} aria-label="Camera">
            <ToggleGroupItem value="establishing">Est</ToggleGroupItem>
            <ToggleGroupItem value="wide">Wide</ToggleGroupItem>
            <ToggleGroupItem value="medium">Med</ToggleGroupItem>
            <ToggleGroupItem value="close">Close</ToggleGroupItem>
          </ToggleGroup>
          <div class="flex w-64 items-center gap-2">
            <Slider min={260} max={1240} value={width} onValueChange={setWidth} aria-label="Width" />
            <span class="font-mono text-xs">{width[0]}</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Popover</Button>
            </PopoverTrigger>
            <PopoverContent>Popover content in a portal.</PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="primary">Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Download PNG</DropdownMenuItem>
              <DropdownMenuItem>Copy JSON</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Reset</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Sheet</Button>
            </SheetTrigger>
            <SheetContent title="Preview">
              <p class="p-4">Bottom sheet.</p>
            </SheetContent>
          </Sheet>
        </div>

        <div class="h-64 rounded-md border border-border">
          <ResizablePanelGroup orientation="vertical" defaultLayout={[60, 40]}>
            <ResizablePanel minSize={30}>
              <ResizablePanelGroup orientation="horizontal" defaultLayout={[50, 50]}>
                <ResizablePanel minSize={25}>
                  <ScrollArea class="h-full p-2">
                    {Array.from({ length: 30 }, (_, i) => (
                      <p key={i}>Configure row {i + 1}</p>
                    ))}
                  </ScrollArea>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel minSize={25}>
                  <div class="p-2 font-mono text-xs">JSON</div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={25}>
              <div class="p-2">Preview</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}
