import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Small metadata marker: age rating, quality, «новинка». Never interactive.
 *
 * `Badge` is one of only two places the system allows ALL CAPS (the other is
 * form labels and overlines), which is why the uppercase and letterspacing are
 * baked in rather than left to the caller.
 */
const badgeVariants = cva(
  [
    "inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden",
    "rounded-xs border border-transparent px-2",
    "font-sans text-micro font-semibold tracking-[var(--ls-label)] uppercase whitespace-nowrap",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-silver-a08 text-muted-foreground",
        outline: "border-border text-muted-foreground",
        solid: "bg-primary text-primary-foreground",
        glass: "surface-glass border-[var(--border-hairline)] text-foreground",
        live: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {variant === "live" && !asChild ? (
        <span aria-hidden className="size-[7px] rounded-full bg-live" />
      ) : null}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
