import { PosterCard } from "@/components/media/poster-card";
import { Rail } from "@/components/catalog/rail";
import { cardScore, titleMeta } from "@/lib/format";
import type { TitleSummary } from "@/lib/domain/models";

export interface TitleRailProps {
  title: string;
  overline?: string;
  note?: string;
  items: TitleSummary[];
  actionHref?: string;
  /**
   * Preload the first few posters. Off by default, and worth turning on for at
   * most one rail per page: `priority` is a request to fetch *ahead* of the
   * document's other images, so every extra one takes bandwidth from the LCP
   * element rather than adding to it.
   */
  priority?: boolean;
}

/**
 * A rail of catalogue titles. Fewer, larger tiles than a dense streaming grid —
 * around seven per row at the 1440px content width, 16px apart, which is what
 * the spacing tokens are tuned for.
 *
 * Nothing here is preloaded unless the page asks: this used to prime the first
 * four posters of *every* rail, so the home page issued nine image preloads and
 * eight of them competed with the hero backdrop that decides its LCP.
 */
export function TitleRail({
  title,
  overline,
  note,
  items,
  actionHref,
  priority = false,
}: TitleRailProps) {
  if (items.length === 0) return null;

  return (
    <Rail title={title} overline={overline} note={note} actionHref={actionHref}>
      {items.map((item, index) => (
        <PosterCard
          key={`${item.kind}-${item.id}`}
          href={item.href}
          title={item.title}
          meta={titleMeta(item)}
          poster={item.poster}
          badge={item.ageRating}
          score={cardScore(item)}
          sizes="184px"
          priority={priority && index < 2}
          className="w-[136px] shrink-0 snap-start md:w-[184px]"
        />
      ))}
    </Rail>
  );
}
