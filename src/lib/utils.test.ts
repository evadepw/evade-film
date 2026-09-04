import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

/**
 * These guard a bug that shipped invisibly: tailwind-merge does not know the
 * design system's type scale, filed `text-title-3` under *text colour*, and
 * dropped the `text-primary-foreground` that came before it — leaving the hero
 * CTA with white text on a white gradient.
 */
describe("cn", () => {
  it("keeps a text colour and a type-scale size together", () => {
    const result = cn("text-primary-foreground", "text-title-3");
    expect(result).toContain("text-primary-foreground");
    expect(result).toContain("text-title-3");
  });

  it("keeps them together in the other order too", () => {
    // cva emits base classes before variant ones, so both orders occur.
    const result = cn("text-micro", "text-muted-foreground");
    expect(result).toContain("text-micro");
    expect(result).toContain("text-muted-foreground");
  });

  it.each([
    ["text-body", "text-title-1"],
    ["text-display-1", "text-caption"],
  ])("still collapses two sizes: %s then %s", (first, second) => {
    expect(cn(first, second)).toBe(second);
  });

  it("still collapses two colours", () => {
    expect(cn("text-foreground", "text-muted-foreground")).toBe("text-muted-foreground");
  });

  it("leaves unrelated utilities alone", () => {
    expect(cn("flex", "text-body", "text-foreground")).toBe("flex text-body text-foreground");
  });
});
