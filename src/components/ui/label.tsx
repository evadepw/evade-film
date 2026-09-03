"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Form label, set in the system's letterspaced label style. */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "type-label text-muted-foreground select-none",
        "peer-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
