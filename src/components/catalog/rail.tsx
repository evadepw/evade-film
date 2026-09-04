"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SectionHeader } from "@/components/layout/section-header";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/dictionary-context";

export interface RailProps {
  title: string;
  overline?: string;
  note?: string;
  /** Optional «Все» link. Omit to hide it. */
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * The catalogue's primary layout unit: a titled horizontal row.
 *
 * Arrows and the «Все» link only exist on hover, per the design system — the
 * row itself is the affordance, the chrome is not. An arrow is *mounted* only
 * when there is somewhere to scroll in that direction: hiding it with `opacity`
 * left it in the tab order, so a keyboard visitor crossed two invisible buttons
 * per row, half of them on rows that did not overflow at all.
 */
export function Rail({
  title,
  overline,
  note,
  actionHref,
  actionLabel,
  children,
  className,
}: RailProps) {
  const t = useDictionary();
  const allLabel = actionLabel ?? t.action.all;

  const scroller = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ back: false, forward: false });

  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    // A pixel of slack: fractional layout widths leave an exhausted scroller
    // reporting `scrollLeft` a fraction short of its maximum.
    const remaining = node.scrollWidth - node.clientWidth - node.scrollLeft;
    const next = { back: node.scrollLeft > 1, forward: remaining > 1 };

    // Returning the current object when nothing moved is what keeps a scroll —
    // which fires per frame — from re-rendering the whole row 60 times a second.
    setCanScroll((current) =>
      current.back === next.back && current.forward === next.forward ? current : next,
    );
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;

    measure();
    node.addEventListener("scroll", measure, { passive: true });

    // The viewport resizing changes `clientWidth`; a card resizing (a font
    // swapping in, artwork settling) changes `scrollWidth`. Both move the ends.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const card of Array.from(node.children)) observer.observe(card);

    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, children]);

  const scrollBy = (direction: -1 | 1) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className={cn("group/rail relative", className)}>
      <SectionHeader
        title={title}
        overline={overline}
        note={note}
        actionHref={actionHref}
        actionLabel={allLabel}
        className="mb-6"
      />

      <div
        ref={scroller}
        className="no-scrollbar flex snap-x snap-proximity gap-4 overflow-x-auto pb-1"
      >
        {children}
      </div>

      {(
        [
          ["left", -1, "-left-4", ChevronLeft, canScroll.back, t.action.scrollBack],
          ["right", 1, "-right-4", ChevronRight, canScroll.forward, t.action.scrollForward],
        ] as const
      ).map(([key, direction, position, Icon, enabled, label]) =>
        enabled ? (
        <button
          key={key}
          type="button"
          onClick={() => scrollBy(direction)}
          aria-label={label}
          className={cn(
            "surface-glass absolute top-[52%] hidden size-9 items-center justify-center rounded-full border border-border text-foreground",
            "opacity-0 transition-opacity duration-200 ease-evade group-hover/rail:opacity-100 focus-visible:opacity-100",
            "lg:flex",
            position,
          )}
        >
          <Icon size={18} strokeWidth={1.5} />
        </button>
        ) : null,
      )}
    </section>
  );
}
