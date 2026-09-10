import { TitleRail } from "@/components/catalog/title-rail";
import type { Collection } from "@/lib/domain/models";

export interface CollectionRailProps {
  collection: Collection;
  /** Set as the rail's overline. The page supplies the translated word. */
  overline?: string;
  /** Preload the first posters. At most one rail per page — see `TitleRail`. */
  priority?: boolean;
}

/**
 * One editorial shelf as a rail.
 *
 * A collection is not a third kind of content, so this deliberately adds no
 * card of its own: it unwraps the shelf and hands its titles to the same
 * `TitleRail` the catalogue uses. The «Все» link goes to the collection's own
 * page, which is where the cards past the row's limit live.
 *
 * A shelf whose items were never asked for (`expand=items` omitted) is not the
 * same as an empty one, and neither renders — but only the first is worth
 * fetching for, which is the caller's decision, not this component's.
 */
export function CollectionRail({ collection, overline, priority }: CollectionRailProps) {
  const items = collection.items;
  if (!items || items.length === 0) return null;

  return (
    <TitleRail
      overline={overline}
      title={collection.title}
      note={collection.description ?? undefined}
      items={items}
      actionHref={collection.href}
      priority={priority}
    />
  );
}
