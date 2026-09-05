"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useDictionary } from "@/lib/i18n/dictionary-context";
import { cn } from "@/lib/utils";

/**
 * The home hero as a deck of titles.
 *
 * The slides arrive already rendered from the server — this component never
 * sees a title, only children — so the artwork, the copy and the links stay in
 * the server component that built them, and the client ships paging and
 * nothing else.
 *
 * Paging is a scroll container with snap points rather than a transform: a
 * swipe on a phone is then the browser's own gesture, at the browser's own
 * frame rate, and the arrows and dots are just `scrollTo`. Nothing rotates on
 * its own — a hero that moves while you are reading it is a hero you have to
 * chase.
 */
export function HeroCarousel({ children }: { children: ReactNode }) {
  const t = useDictionary();

  const slides = Children.toArray(children);
  const count = slides.length;

  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  /**
   * The same number the state holds, readable without re-subscribing anything
   * to it. The resize observer below is mounted once and needs the current
   * slide; re-creating it per slide made it fire mid-scroll and yank the deck
   * back to wherever the animation had got to.
   */
  const current = useRef(0);

  /** Adopt whatever the scroll position says. The scroll is the truth. */
  const sync = useCallback(() => {
    const node = track.current;
    if (!node || node.clientWidth === 0) return;

    const next = Math.round(node.scrollLeft / node.clientWidth);
    if (next === current.current) return;
    current.current = next;
    setIndex(next);
  }, []);

  /**
   * Where a click asked the deck to go, until the scrolling agrees. The dots
   * answer the click immediately — waiting for a smooth scroll to arrive
   * before lighting one up reads as a dead button — and the frames in between
   * report every slide the animation crosses, which is what this swallows.
   */
  const pending = useRef<number | null>(null);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (next: number) => {
      const node = track.current;
      if (!node) return;

      const target = ((next % count) + count) % count;
      // Wrapping past the end would otherwise sweep through the whole deck to
      // get back to the front; that ride is nobody's idea of a hero.
      const wraps = Math.abs(target - current.current) > 1;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      pending.current = target;
      if (giveUp.current) clearTimeout(giveUp.current);
      // Long enough for the animation, after which the deck stops waiting and
      // believes the scroll position again — a swipe that interrupted the
      // travel is an answer too, and a truthful dot beats a hopeful one.
      giveUp.current = setTimeout(() => {
        pending.current = null;
        sync();
      }, 700);

      current.current = target;
      setIndex(target);

      node.scrollTo({
        left: target * node.clientWidth,
        behavior: wraps || still ? "auto" : "smooth",
      });
    },
    [count, sync],
  );

  const handleScroll = () => {
    if (pending.current !== null) {
      const node = track.current;
      if (!node || node.clientWidth === 0) return;
      if (Math.round(node.scrollLeft / node.clientWidth) !== pending.current) return;
      pending.current = null;
    }
    sync();
  };

  // A resize changes what one slide is worth; without this the deck ends up
  // parked between two of them. Width only — a `ResizeObserver` also reports
  // the size it started at, and anything else would re-align on that.
  useEffect(() => {
    const node = track.current;
    if (!node) return;

    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth === width) return;
      width = node.clientWidth;
      node.scrollTo({ left: current.current * width, behavior: "auto" });
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (giveUp.current) clearTimeout(giveUp.current);
    };
  }, []);

  if (count === 0) return null;
  if (count === 1) return <>{slides[0]}</>;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.home.heroOverline}
      className="group/hero relative"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        goTo(current.current + (event.key === "ArrowLeft" ? -1 : 1));
      }}
    >
      <div
        ref={track}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {slides.map((slide, position) => (
          <div
            key={position}
            role="group"
            aria-roledescription="slide"
            aria-label={t.home.heroSlide(position + 1, count)}
            // Off-stage slides keep their buttons out of the tab order: five
            // «Смотреть» in a row, four of them invisible, is not a hero.
            inert={position !== index}
            className="w-full shrink-0 snap-start"
          >
            {slide}
          </div>
        ))}
      </div>

      {(
        [
          ["back", -1, "left-4 md:left-8", ChevronLeft, t.home.heroPrev],
          ["forward", 1, "right-4 md:right-8", ChevronRight, t.home.heroNext],
        ] as const
      ).map(([key, direction, position, Icon, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => goTo(current.current + direction)}
          aria-label={label}
          className={cn(
            "surface-glass absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border text-foreground",
            // Same rule as the rails: the arrows are chrome, so they appear
            // when the pointer is on the thing they belong to. A touch screen
            // has the swipe, and a keyboard has the dots.
            "opacity-0 transition-opacity duration-200 ease-evade group-hover/hero:opacity-100 focus-visible:opacity-100",
            "lg:flex",
            position,
          )}
        >
          <Icon size={20} strokeWidth={1.5} />
        </button>
      ))}

      {/*
        The dots sit under the copy on a phone and on its baseline from `md` up,
        where the text block stops at 520px and leaves the right half empty.
      */}
      <div className="page-gutter pointer-events-none absolute inset-x-0 bottom-5 md:bottom-16 lg:bottom-20">
        <div className="mx-auto flex w-full max-w-(--container-content) justify-end">
          <div className="pointer-events-auto flex items-center gap-2">
            {slides.map((_, position) => (
              <button
                key={position}
                type="button"
                onClick={() => goTo(position)}
                aria-label={t.home.heroSlide(position + 1, count)}
                aria-current={position === index ? "true" : undefined}
                className="flex h-6 items-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-[3px] rounded-full transition-all duration-200 ease-evade",
                    position === index ? "w-7 bg-silver-1" : "w-3.5 bg-silver-a20 hover:bg-silver-a40",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
