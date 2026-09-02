import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's class helper: clsx for conditionals, tailwind-merge for overrides. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
