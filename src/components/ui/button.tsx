import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * shadcn `Button`, retuned to the Evade Films spec:
 *  - control radius 8px, heights 32 / 40 / 52;
 *  - hover lightens the fill by one alpha step and never changes hue;
 *  - press is `scale(.985)` and nothing else;
 *  - `chrome` is the brushed-metal gradient lifted from the logo — ink text on
 *    metal, a milled edge, and a specular sweep on hover. One hero CTA per
 *    screen, never two.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-transparent",
    "font-sans font-semibold tracking-[0.01em] whitespace-nowrap select-none",
    "transition-all duration-150 ease-evade",
    "outline-none disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[.985]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-silver-2",
        chrome: [
          "relative isolate overflow-hidden text-primary-foreground",
          "bg-[image:var(--chrome-grad)] hover:brightness-[1.04]",
          // A milled edge: lit top, shaded bottom, and a drop shadow so the chip
          // sits *on* the page instead of being a hole cut into it.
          "shadow-[var(--shadow-2),inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(8,9,10,0.22)]",
          // Specular sweep on hover — the one animated brand flourish.
          "before:pointer-events-none before:absolute before:inset-y-0 before:-left-[60%] before:-z-10 before:w-1/2",
          "before:bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.9)_50%,transparent_100%)]",
          "before:transition-transform before:duration-[550ms] before:ease-evade",
          "hover:before:translate-x-[420%] motion-reduce:before:hidden",
        ].join(" "),
        secondary: "bg-silver-a08 text-foreground border-border hover:bg-silver-a12",
        outline: "border-silver-a20 text-foreground hover:bg-silver-a04 hover:border-silver-a40",
        ghost: "text-muted-foreground hover:bg-silver-a04 hover:text-foreground",
        glass:
          "surface-glass border-border text-foreground hover:bg-silver-a12 hover:border-silver-a20",
        destructive: "bg-[var(--state-danger-quiet)] text-destructive hover:brightness-125",
        link: "text-foreground underline-offset-4 hover:underline hover:opacity-85",
      },
      size: {
        sm: "h-8 px-3.5 text-body-sm gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        default: "h-10 px-5 text-body [&_svg:not([class*='size-'])]:size-[18px]",
        lg: "h-13 px-7 text-title-3 gap-2.5 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-lg": "size-13 [&_svg:not([class*='size-'])]:size-5",
      },
      pill: {
        true: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  pill,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, pill, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
