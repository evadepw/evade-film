import { PosterCard } from "@/components/media/poster-card";
import { cardScore, titleMeta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TitleSummary } from "@/lib/domain/models";

export interface TitleGridProps {
  items: TitleSummary[];
  className?: string;
}

/** The catalogue grid: auto-fill, 180px minimum, 32px row / 20px column gaps. */
export function TitleGrid({ items, className }: TitleGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]",
        className,
      )}
    >
      {items.map((item) => (
        <PosterCard
          key={`${item.kind}-${item.id}`}
          href={item.href}
          title={item.title}
          meta={titleMeta(item)}
          poster={item.poster}
          badge={item.ageRating}
          score={cardScore(item)}
          sizes="(max-width: 768px) 45vw, 200px"
        />
      ))}
    </div>
  );
}
