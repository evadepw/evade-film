import type { CSSProperties } from "react";

import { Poster } from "@/components/media/poster";
import { cn } from "@/lib/utils";
import type { TitleSummary } from "@/lib/domain/models";

/**
 * How a shelf without its own artwork draws itself.
 *
 * Collections are authored without a poster more often than not — the admin
 * asks for a title and a source, and the artwork field is optional — so the
 * fallback is not the empty-frame placeholder but the shelf's own contents.
 * These are the arrangements of that:
 *
 * - `deck`  — a bare fan of covers, no ground behind it. Reads as «a set»
 *             rather than «a film», which is the job. Default.
 * - `strip` — three posters edge to edge, hard-cut. Quiet, reads as content.
 * - `stack` — overlapping upright covers with depth falloff, left-anchored.
 * - `skew`  — full-bleed diagonal columns. The loudest of the five.
 * - `wash`  — the first poster blurred to a ground, crisp covers floating on it.
 */
export type CollectionCoverVariant = "strip" | "deck" | "stack" | "skew" | "wash";

export interface CollectionCoverProps {
  /** Titles with artwork, already filtered. The cover takes what it needs. */
  items: TitleSummary[];
  /** The shelf's own poster or backdrop. Always wins over a collage. */
  artwork?: string | null;
  /** Shown in the empty frame when there is neither artwork nor contents. */
  label?: string;
  variant?: CollectionCoverVariant;
  sizes?: string;
  priority?: boolean;
}

/**
 * The others stay because they are a per-shelf decision, not a dead branch:
 * these render on the server only, so the four unused ones cost the browser
 * nothing.
 */
const DEFAULT_VARIANT: CollectionCoverVariant = "deck";

/** How many covers each arrangement can hold before it stops reading. */
const CAPACITY: Record<CollectionCoverVariant, number> = {
  strip: 3,
  deck: 5,
  stack: 4,
  skew: 4,
  wash: 3,
};

/**
 * The ink ground, for the arrangements that leave some frame uncovered. The
 * ones that bleed to all four edges get none: a panel behind a full-bleed
 * collage is only ever visible as a seam.
 */
const GROUND = "bg-[image:var(--placeholder-fill)]";

const NEEDS_GROUND: Record<CollectionCoverVariant, boolean> = {
  strip: false,
  // Paints its own, out of the lead cover.
  deck: false,
  stack: true,
  skew: false,
  // Paints its own ground out of the lead cover.
  wash: false,
};

/** One cover in a collage. Never the frame itself — the arrangement sizes it. */
function Cover({
  item,
  className,
  imageClassName,
  sizes = "180px",
  priority,
}: {
  item: TitleSummary;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Poster
      src={item.poster}
      ratio="poster"
      rounded={false}
      sizes={sizes}
      priority={priority}
      className={className}
      imageClassName={imageClassName}
    />
  );
}

/**
 * A cover blown up and blurred into a flat field of its own colour. Stands in
 * for a grey panel behind the arrangements that do not fill the frame: the
 * card still has a background, but it is one that came out of the shelf.
 */
function BlurGround({ item }: { item: TitleSummary }) {
  return (
    <>
      <div className="absolute inset-0 scale-150 opacity-70 blur-3xl saturate-150">
        {/*
          Asked for at the same width the crisp covers are, so the browser
          serves this out of the copy it already has rather than fetching a
          second candidate — it is blurred past recognition either way.
        */}
        <Cover
          item={item}
          sizes="160px"
          className="h-full w-full shadow-none"
          imageClassName="object-cover"
        />
      </div>
      {/* Enough to seat the crisp covers on it, not enough to flatten it. */}
      <div className="absolute inset-0 bg-[var(--ink-1)]/35" />
    </>
  );
}

export function CollectionCover({
  items,
  artwork,
  label,
  variant = DEFAULT_VARIANT,
  sizes = "(max-width: 768px) 90vw, 420px",
  priority,
}: CollectionCoverProps) {
  // A shelf that was given artwork uses it. The collages exist because most
  // are not, and none of them beats a picture someone chose on purpose.
  if (artwork) {
    return (
      <Poster src={artwork} alt="" ratio="still" label={label} sizes={sizes} priority={priority} />
    );
  }

  const covers = items.filter((item) => item.poster).slice(0, CAPACITY[variant]);

  if (covers.length === 0) {
    return <Poster src={null} ratio="still" label={label} sizes={sizes} />;
  }

  return (
    <div
      aria-hidden
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg",
        // The hairline outlines the frame, so it only belongs where there is
        // a frame to outline. Over a bare fan it draws an empty box.
        NEEDS_GROUND[variant] && `${GROUND} shadow-[var(--inset-hairline)]`,
      )}
    >
      {variant === "strip" ? <Strip covers={covers} priority={priority} /> : null}
      {variant === "deck" ? <Deck covers={covers} priority={priority} /> : null}
      {variant === "stack" ? <Stack covers={covers} priority={priority} /> : null}
      {variant === "skew" ? <Skew covers={covers} priority={priority} /> : null}
      {variant === "wash" ? <Wash covers={covers} priority={priority} /> : null}
    </div>
  );
}

interface ArrangementProps {
  covers: TitleSummary[];
  priority?: boolean;
}

/**
 * Equal thirds, edge to edge. The posters are cropped from the top because a
 * 2:3 cover squeezed into a third of a 16:9 frame loses its foot, and a
 * poster's title is at the top far more often than at the bottom.
 */
function Strip({ covers, priority }: ArrangementProps) {
  return (
    <div className="flex h-full w-full gap-px">
      {covers.map((item, index) => (
        <Cover
          key={`${item.kind}-${item.id}`}
          item={item}
          sizes="150px"
          priority={priority && index === 0}
          className="h-full w-full flex-1 shadow-none"
          imageClassName="object-cover object-top"
        />
      ))}
    </div>
  );
}

/**
 * One cover's share of the card's width. Big enough to carry its artwork,
 * small enough that the silhouette — the staggered tops, the rounded corners,
 * the leans — survives instead of being cropped off into a strip.
 */
const DECK_COVER = 32;
/** Outermost lean to outermost lean, in degrees. */
const DECK_SPREAD = 24;
/** Kept clear at each edge, in percent of the card's width. */
const DECK_MARGIN = 1;

/**
 * How wide the fan spans — derived, not chosen.
 *
 * A leaning cover reaches further than its own box does: its outer top corner
 * swings out by its *height* times the sine of the lean, and a 2:3 cover is
 * half again as tall as it is wide. Sizing the span by eye is what clipped the
 * outer corners; solving for it means the two constants above can be retuned
 * without the fan ever growing past the frame again.
 */
const DECK_FOOTPRINT = (() => {
  const lean = ((DECK_SPREAD / 2) * Math.PI) / 180;
  const reach = (DECK_COVER / 2) * Math.cos(lean) + DECK_COVER * 1.5 * Math.sin(lean);
  return 2 * (50 - DECK_MARGIN - reach) + DECK_COVER;
})();

/**
 * Below this there is no fan to draw — one cover is a poster and two are a
 * pair. Both go to `Strip`, which is full-bleed at any count.
 */
const DECK_MINIMUM = 3;

/**
 * A fan of covers, straight on the page.
 *
 * Nothing sits behind it. A fan has to be *smaller* than the frame or its
 * silhouette — the staggered tops, the rounded corners, the leans — is what
 * gets cropped away, and it stops reading as a set of cards at all; and a
 * panel behind a shape that small only ever reads as an empty box around it.
 * So the frame stays transparent and the fan is the whole picture.
 *
 * Pointing at one card lifts it out of the arc. See the hover pose below.
 */
function Deck({ covers, priority }: ArrangementProps) {
  const count = covers.length;
  if (count < DECK_MINIMUM) return <Strip covers={covers} priority={priority} />;

  const middle = (count - 1) / 2;

  /*
   * Both the overlap and the step angle are derived from how many covers there
   * are, so a fan of five arcs exactly as wide as a fan of three instead of
   * hanging off both sides of the card. The floor on the overlap is what keeps
   * a pair from drifting into two separate posters with a gap between them.
   */
  const overlap =
    count > 1 ? Math.max(6, (DECK_COVER * count - DECK_FOOTPRINT) / (count - 1)) : 0;
  const step = count > 1 ? DECK_SPREAD / (count - 1) : 0;

  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
      {covers.map((item, index) => {
        const offset = index - middle;
        return (
          <div
            key={`${item.kind}-${item.id}`}
            className={cn(
              "group/cover origin-bottom transition-transform duration-200 ease-evade",
              /*
               * The pose is applied from custom properties rather than written
               * into `style`: an inline `transform` outranks every stylesheet
               * rule, so the hover pose below would silently never apply. The
               * values are still per-card — only their spelling moved.
               *
               * They are set as the separate `rotate` / `translate` properties
               * rather than one `transform`, because that is what the hover
               * utilities write to, and two rules setting `transform` whole
               * would clobber each other's halves instead of layering.
               *
               * The centre card stands upright and in front; the outer ones
               * lean away from it and fall behind, which is what makes a row
               * of rectangles read as a held hand rather than a grid.
               */
              "[rotate:var(--lean)] [translate:0_var(--lift)] [z-index:var(--depth)]",
              /*
               * Picked out of the fan: it straightens, rises and takes the
               * front. Depth stops at 9 — the scrim and the caption sit at 10,
               * and a cover that climbed over those would hide the very title
               * the viewer is reaching for.
               *
               * Plain utilities rather than another arbitrary property: they
               * write to the same separate `rotate` / `translate` / `scale`
               * properties the base pose uses, so the two layer cleanly and
               * the `:hover` selector's extra specificity settles which wins.
               */
              "hover:rotate-0 hover:-translate-y-1.5 hover:scale-[1.04] hover:z-[9]",
            )}
            style={
              {
                width: `${DECK_COVER}%`,
                marginInline: `${-overlap / 2}%`,
                "--lean": `${offset * step}deg`,
                "--lift": `${Math.abs(offset) * 6}%`,
                "--depth": count - Math.round(Math.abs(offset)),
              } as CSSProperties
            }
          >
            <Cover
              item={item}
              sizes="150px"
              priority={priority && index === Math.round(middle)}
              className={cn(
                "rounded-md ring-1 ring-[var(--border-hairline)]",
                "shadow-[var(--shadow-2)] transition-shadow duration-200 ease-evade",
                "group-hover/cover:shadow-[var(--shadow-3)]",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Overlapping upright covers, left-anchored, each one a little smaller and a
 * little dimmer than the one in front of it. The depth falloff is what keeps
 * four near-identical posters from reading as a repeat.
 */
function Stack({ covers, priority }: ArrangementProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-start pl-[6%]">
      {covers.map((item, index) => (
        <div
          key={`${item.kind}-${item.id}`}
          className="w-[30%]"
          style={{
            // A fifth of each cover has to stay clear of the one in front or
            // the stack reads as a single poster with a shadow behind it.
            marginLeft: index === 0 ? 0 : "-10%",
            transform: `scale(${1 - index * 0.05}) translateY(${index * 3}%)`,
            // Front-most first: the leftmost cover is the one in focus, and the
            // rest recede to the right the way a flipped-through shelf does.
            zIndex: covers.length - index,
            opacity: 1 - index * 0.08,
          }}
        >
          <Cover
            item={item}
            sizes="120px"
            priority={priority && index === 0}
            className="rounded-md shadow-[var(--shadow-2)] ring-1 ring-[var(--border-hairline)]"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Full-bleed diagonal columns.
 *
 * The frames are skewed and the artwork inside them is skewed back by the same
 * angle, so the cut is diagonal while the posters stay upright — a poster
 * sheared 12° looks like a rendering fault, not a design. The row is wider
 * than the card and pulled left so the skew never exposes a corner.
 */
function Skew({ covers, priority }: ArrangementProps) {
  return (
    <div className="absolute inset-0 flex w-[124%] -translate-x-[10%] gap-1.5 -skew-x-12">
      {covers.map((item, index) => (
        <div key={`${item.kind}-${item.id}`} className="relative h-full flex-1 overflow-hidden">
          <div className="absolute inset-0 skew-x-12 scale-125">
            <Cover
              item={item}
              sizes="180px"
              priority={priority && index === 0}
              className="h-full w-full shadow-none"
              imageClassName="object-cover object-top"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The first cover blurred out to a ground, with crisp ones floating on it.
 *
 * This is the only arrangement that keeps the left half of the card clear, so
 * it is also the only one where a long shelf title has somewhere to go that is
 * not on top of a poster.
 */
function Wash({ covers, priority }: ArrangementProps) {
  const [lead, ...rest] = covers;

  return (
    <>
      <BlurGround item={lead} />

      <div className="absolute inset-0 flex items-center justify-end pr-[6%]">
        {[lead, ...rest].map((item, index) => (
          <div
            key={`${item.kind}-${item.id}-${index}`}
            className="w-[26%]"
            style={{
              marginLeft: index === 0 ? 0 : "-8%",
              transform: `rotate(${(index - 1) * 4}deg)`,
              zIndex: index,
            }}
          >
            <Cover
              item={item}
              sizes="130px"
              priority={priority && index === 0}
              className="rounded-md shadow-[var(--shadow-2)] ring-1 ring-[var(--border-hairline)]"
            />
          </div>
        ))}
      </div>
    </>
  );
}
