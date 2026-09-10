import { CollectionCard } from "@/components/catalog/collection-card";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/domain/models";

export interface CollectionGridProps {
  collections: Collection[];
  /** `(n) => "12 тайтлов"`. Passed in so this stays a server leaf. */
  countLabel?: (count: number) => string;
  className?: string;
}

/**
 * The shelf index. Wider cells than the title grid — these are 16:9, not 2:3,
 * and three across at the content width is what keeps a shelf's own artwork
 * legible instead of turning it into a thumbnail.
 */
export function CollectionGrid({ collections, countLabel, className }: CollectionGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-5 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]",
        className,
      )}
    >
      {collections.map((collection, index) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          countLabel={
            countLabel && collection.items ? countLabel(collection.items.length) : undefined
          }
          sizes="(max-width: 768px) 90vw, 380px"
          priority={index < 3}
        />
      ))}
    </div>
  );
}
