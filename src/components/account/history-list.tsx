"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { ContentRow } from "@/components/interactions/content-row";
import { ListShell } from "@/components/account/list-shell";
import { useMyHistory } from "@/hooks/use-me";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { contentMeta, formatRelativeTime, formatRemaining, joinMeta } from "@/lib/format";

type Filter = "all" | "finished" | "unfinished";

/** Everything the viewer has played, most recent first. */
export function HistoryList() {
  const t = useDictionary();

  const [filter, setFilter] = useState<Filter>("all");

  const list = useMyHistory({
    finished: filter === "all" ? undefined : filter === "finished",
  });

  return (
    <ListShell
      title={t.history.title}
      total={list.total}
      isLoading={list.isLoading}
      isError={list.isError}
      isEmpty={list.items.length === 0}
      emptyTitle={t.history.empty}
      emptyHint={t.history.emptyHint}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onLoadMore={() => void list.loadMore()}
      filters={
        <ToggleGroup
          type="single"
          size="sm"
          value={filter}
          onValueChange={(value) => value && setFilter(value as Filter)}
        >
          <ToggleGroupItem value="all">{t.history.all}</ToggleGroupItem>
          <ToggleGroupItem value="unfinished">{t.history.unfinished}</ToggleGroupItem>
          <ToggleGroupItem value="finished">{t.history.finished}</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {list.items.map((entry) => (
        <ContentRow
          key={entry.id}
          content={entry.content}
          progress={entry.progress}
          meta={joinMeta([
            contentMeta(entry.content),
            formatRelativeTime(entry.watchedAt),
            entry.isFinished
              ? t.history.finished
              : formatRemaining(entry.positionSeconds, entry.durationSeconds),
          ])}
          aside={
            <Button asChild variant="ghost" size="sm">
              <Link href={entry.content.watchHref}>
                {entry.isFinished ? t.action.watch : t.history.resume}
              </Link>
            </Button>
          }
        />
      ))}
    </ListShell>
  );
}
