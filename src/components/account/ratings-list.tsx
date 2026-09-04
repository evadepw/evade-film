"use client";

import { ContentRow } from "@/components/interactions/content-row";
import { ListShell } from "@/components/account/list-shell";
import { useMyRatings } from "@/hooks/use-me";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { formatRelativeTime } from "@/lib/format";

/** Every score the viewer has given, newest first. */
export function RatingsList() {
  const t = useDictionary();

  const list = useMyRatings();

  return (
    <ListShell
      title={t.account.ratings}
      total={list.total}
      isLoading={list.isLoading}
      isError={list.isError}
      isEmpty={list.items.length === 0}
      emptyTitle={t.account.noRatings}
      emptyHint={t.account.noRatingsHint}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onLoadMore={() => void list.loadMore()}
    >
      {list.items.map((rating) => (
        <ContentRow
          key={rating.id}
          content={rating.content}
          aside={
            <div className="flex flex-col items-end gap-1">
              <span className="font-display text-title-2 leading-none font-light">
                {rating.value}
              </span>
              <span className="text-caption text-[var(--text-disabled)]">
                {formatRelativeTime(rating.updatedAt)}
              </span>
            </div>
          }
        />
      ))}
    </ListShell>
  );
}
