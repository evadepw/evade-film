import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Multi-line input on the Evade scale — same fill, hairline and focus rule as
 * `Input`, only taller and resizable on the vertical axis alone.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-y rounded-sm border border-input bg-[var(--surface-input)] text-foreground",
        "min-h-20 px-3.5 py-2.5 font-sans text-body",
        "transition-colors duration-150 ease-evade outline-none",
        "placeholder:text-[var(--text-disabled)]",
        "hover:border-silver-a20 focus-visible:border-[var(--border-focus)]",
        "disabled:pointer-events-none disabled:opacity-40",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
