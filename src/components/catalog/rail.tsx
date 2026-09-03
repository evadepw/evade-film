"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SectionHeader } from "@/components/layout/section-header";
import { cn } from "@/lib/utils";
import { dictionary } from "@/lib/i18n/dictionary";

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
 * row itself is the affordance, the chrome is not.
 */
export function Rail({
  title,
  overline,
  note,
  actionHref,
  actionLabel = dictionary.action.all,
  children,
  className,
}: RailProps) {
  const scroller = useRef<HTMLDivElement>(null);

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
        actionLabel={actionLabel}
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
          ["left", -1, "-left-4", ChevronLeft],
          ["right", 1, "-right-4", ChevronRight],
        ] as const
      ).map(([key, direction, position, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => scrollBy(direction)}
          aria-label={key === "left" ? "Назад" : "Вперёд"}
          className={cn(
            "surface-glass absolute top-[52%] hidden size-9 items-center justify-center rounded-full border border-border text-foreground",
            "opacity-0 transition-opacity duration-200 ease-evade group-hover/rail:opacity-100 focus-visible:opacity-100",
            "lg:flex",
            position,
          )}
        >
          <Icon size={18} strokeWidth={1.5} />
        </button>
      ))}
    </section>
  );
}
