"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TagProps extends React.ComponentProps<"button"> {
  selected?: boolean;
}

/**
 * A selectable filter chip. Pill shape, sentence case, no hue change on hover —
 * selection is carried by fill inversion alone.
 */
export function Tag({ selected = false, className, ...props }: TagProps) {
  return (
    <button
      type="button"
      data-slot="tag"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap",
        "transition-all duration-150 ease-evade outline-none active:scale-[.985]",
        selected
          ? "border-transparent bg-primary text-primary-foreground hover:bg-silver-2"
          : "border-border text-muted-foreground hover:bg-silver-a04 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
