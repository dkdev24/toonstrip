/**
 * Slider with the shadcn look on a native <input type="range">.
 * Radix Slider is not used: under preact/compat its thumb index is memoised before
 * the collection registers items, so the thumb renders display:none.
 * API mirrors shadcn's: value/defaultValue as number[], onValueChange(number[]).
 */
import { useState } from "preact/hooks";
import { cn } from "../../lib/utils";

interface Props {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  class?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  onValueChange?: (v: number[]) => void;
}

export function Slider({ value, defaultValue, min = 0, max = 100, step = 1, disabled, onValueChange, className, ...props }: Props) {
  const [inner, setInner] = useState(defaultValue?.[0] ?? min);
  const v = value?.[0] ?? inner;
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={v}
      disabled={disabled}
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      style={{ "--slider-pct": `${pct}%` }}
      onInput={(e) => {
        const n = Number((e.currentTarget as HTMLInputElement).value);
        if (value === undefined) setInner(n);
        onValueChange?.([n]);
      }}
      className={cn(
        "ui-slider h-4 w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
        "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-primary)_var(--slider-pct),var(--color-border)_var(--slider-pct))]",
        "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border-strong [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-md",
        "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border-strong [&::-moz-range-thumb]:bg-card",
        "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-ring/40 focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-ring/40",
        className,
        props.class,
      )}
    />
  );
}
