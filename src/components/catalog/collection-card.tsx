import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  CollectionCover,
  type CollectionCoverVariant,
} from "@/components/catalog/collection-cover";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/domain/models";

export interface CollectionCardProps {
  collection: Collection;
  /** `n подборок` for the corner. Resolved by the caller — this is a server leaf. */
  countLabel?: string | null;
  /** How a shelf without artwork draws itself. See `CollectionCover`. */
  variant?: CollectionCoverVariant;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * A shelf as a 16:9 tile.
 *
 * The artwork is `CollectionCover`'s problem, not this component's: a shelf
 * with a poster shows it, and one without draws a collage out of its own
 * contents. What lives here is the frame, the scrim and the caption — the
 * parts that do not change with the arrangement.
 */
export function CollectionCard({
  collection,
  countLabel,
  variant,
  sizes = "(max-width: 768px) 90vw, 420px",
  priority,
  className,
}: CollectionCardProps) {
  return (
    <Link
      href={collection.href}
      className={cn("group/card block rounded-lg focus-visible:outline-none", className)}
    >
      <div className="relative transition-transform duration-200 ease-evade group-hover/card:-translate-y-1">
        <CollectionCover
          items={collection.items ?? []}
          artwork={collection.backdrop ?? collection.poster}
          label={collection.title}
          variant={variant}
          sizes={sizes}
          priority={priority}
        />

        {/*
          Text over media gets a scrim and never a card — the same rule the hero
          follows. Here it also has to survive a mosaic of arbitrary posters, so
          the gradient is opaque at the foot rather than merely tinted.

          `pointer-events-none` because it covers the lower two thirds of the
          frame: left as a hit target it swallows the hover on every cover the
          collage draws underneath it.
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 rounded-b-lg bg-gradient-to-t from-[var(--surface-page)] via-[var(--scrim-flat)] to-transparent"
        />

        {/* Above the collage: the tilted covers carry their own `z-index`, and
            without one here a fan slides over its own caption. */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-title-3 font-medium text-foreground">{collection.title}</p>
            {collection.description ? (
              <p className="mt-1 truncate text-body-sm text-muted-foreground">
                {collection.description}
              </p>
            ) : countLabel ? (
              <p className="type-overline mt-1 text-[var(--text-disabled)]">{countLabel}</p>
            ) : null}
          </div>

          <ChevronRight
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="mb-1 shrink-0 text-muted-foreground transition-transform duration-200 ease-evade group-hover/card:translate-x-0.5 group-hover/card:text-foreground"
          />
        </div>
      </div>
    </Link>
  );
}
