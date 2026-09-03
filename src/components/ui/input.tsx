import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Text input on the Evade scale: 40px default, 52px for the search hero, an
 * `--surface-input` fill and a hairline that strengthens on hover.
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
        "disabled:pointer-events-none disabled:opacity-40",
        "aria-invalid:border-destructive",
        inputSize === "lg" ? "h-13 px-4 text-title-3" : "h-10 px-3.5 text-body",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
