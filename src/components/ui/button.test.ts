import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The `chrome` CTA sits on a near-white brushed-metal gradient, so its ink text
 * colour is not decoration — it is the only thing making the label readable. It
 * was silently dropped once already, by the class-merge conflict `cn` now
 * resolves, and nothing failed: the button simply went white on white.
 */
describe("buttonVariants", () => {
  it.each(["sm", "default", "lg"] as const)("keeps chrome's ink text at size %s", (size) => {
    expect(buttonVariants({ variant: "chrome", size })).toContain("text-primary-foreground");
  });

  it("keeps the default variant's ink text at every size", () => {
    for (const size of ["sm", "default", "lg"] as const) {
      expect(buttonVariants({ variant: "default", size })).toContain("text-primary-foreground");
    }
  });

  it("still applies the size's type scale", () => {
    expect(buttonVariants({ variant: "chrome", size: "lg" })).toContain("text-title-3");
    expect(buttonVariants({ variant: "chrome", size: "sm" })).toContain("text-body-sm");
  });

  it("lets a caller override the variant colour", () => {
    // `cva` only concatenates; the merge is what `Button` itself does with the
    // result, so the override has to be asserted through the same composition.
    const classes = cn(buttonVariants({ variant: "chrome", className: "text-foreground" }));

    expect(classes).toContain("text-foreground");
    expect(classes).not.toContain("text-primary-foreground");
    // The size that came with the variant survives the override.
    expect(classes).toContain("text-body");
  });
});
