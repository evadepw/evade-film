"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ContentRow } from "@/components/interactions/content-row";
import { ListShell } from "@/components/account/list-shell";
import { STATUS_LABELS } from "@/components/interactions/watchlist-button";
import { useMyWatchlist } from "@/hooks/use-me";
import { dictionary } from "@/lib/i18n/dictionary";
import type { WatchlistStatus } from "@/lib/domain/models";

const ANY = "any";

/** The shelf, filtered the two ways the endpoint supports: status and favourites. */
export function WatchlistList() {
  const [status, setStatus] = useState<WatchlistStatus | typeof ANY>(ANY);
  const [favorite, setFavorite] = useState(false);

  const list = useMyWatchlist({
    status: status === ANY ? undefined : status,
    favorite: favorite || undefined,
  });

  return (
    <ListShell
      title={dictionary.watchlist.title}
      total={list.total}
      isLoading={list.isLoading}
      isError={list.isError}
      isEmpty={list.items.length === 0}
      emptyTitle={dictionary.watchlist.empty}
      emptyHint={dictionary.watchlist.emptyHint}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onLoadMore={() => void list.loadMore()}
      filters={
        <div className="flex items-center gap-2">
          <Toggle
            variant="outline"
            size="sm"
            pressed={favorite}
            onPressedChange={setFavorite}
            aria-label={dictionary.watchlist.onlyFavorites}
          >
            <Star strokeWidth={1.5} />
            {dictionary.watchlist.onlyFavorites}
          </Toggle>

          <Select value={status} onValueChange={(value) => setStatus(value as WatchlistStatus)}>
            <SelectTrigger size="sm" className="w-[170px]" aria-label={dictionary.watchlist.status}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{dictionary.watchlist.anyStatus}</SelectItem>
              {(Object.keys(STATUS_LABELS) as WatchlistStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {list.items.map((entry) => (
        <ContentRow
          key={entry.id}
          content={entry.content}
          aside={
            <div className="flex items-center gap-2">
              {entry.isFavorite ? (
                <Star
                  size={16}
                  strokeWidth={1.5}
                  className="fill-silver-1 text-silver-1"
                  aria-label={dictionary.watchlist.favorite}
                />
              ) : null}
              <Badge variant="outline">{STATUS_LABELS[entry.status]}</Badge>
            </div>
          }
        >
          {entry.note ? (
            <p className="max-w-(--max-prose) text-caption text-muted-foreground">{entry.note}</p>
          ) : null}
        </ContentRow>
      ))}
    </ListShell>
  );
}
