import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Text input on the Evade scale: 40px default, 52px for the search hero, an
 * `--surface-input` fill and a hairline that strengthens on hover.
 *
 * Focus is the hairline going to `--border-focus`, and nothing else — no ring.
 * The page-wide one is drawn detached, with an ink gap around it, so on a field
 * that already has a border of its own it stacks three edges in a row. A field
 * is not a button: it has an edge to light up, and the token exists for that.
 *
 * Radius follows the height: 8px is the control radius, but on the 52px search
 * field it reads as a square with the corners filed off, so that size takes the
 * 12px of the surfaces around it.
 */
function Input({
  className,
  type,
  inputSize = "default",
  ...props
}: React.ComponentProps<"input"> & { inputSize?: "default" | "lg" }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-sm border border-input bg-[var(--surface-input)] text-foreground",
        "font-sans transition-colors duration-150 ease-evade outline-none",
        "placeholder:text-[var(--text-disabled)]",
        "hover:border-silver-a20",
        "focus-visible:border-[var(--border-focus)] focus-visible:shadow-none",
        "disabled:pointer-events-none disabled:opacity-40",
        "aria-invalid:border-destructive",
        inputSize === "lg" ? "h-13 rounded-lg px-4 text-title-3" : "h-10 px-3.5 text-body",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
