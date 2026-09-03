"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBlock } from "@/components/feedback/state-block";
import { SectionHeader } from "@/components/layout/section-header";
import { dictionary } from "@/lib/i18n/dictionary";

export interface ListShellProps {
  title: string;
  total: number;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyHint?: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** Filters for the section header. */
  filters?: ReactNode;
  children: ReactNode;
}

/**
 * The frame every `/me/` collection shares: a header with a count and its
 * filters, then rows, then «показать ещё».
 *
 * Written once because the four lists differ only in what a row contains — and
 * because the empty state is the part most easily got wrong, and it is the same
 * two lines everywhere: the fact, then the next step.
 */
export function ListShell({
  title,
  total,
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyHint,
  hasMore,
  isLoadingMore,
  onLoadMore,
  filters,
  children,
}: ListShellProps) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeader
        title={title}
        note={total > 0 ? String(total) : undefined}
        actions={filters}
      />

      {isError ? (
        <StateBlock title={dictionary.error.offline} hint={dictionary.error.offlineHint} />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-[110px] w-full rounded-lg" />
          ))}
        </div>
      ) : isEmpty ? (
        <StateBlock title={emptyTitle} hint={emptyHint} className="py-16" />
      ) : (
        <>
          <div className="flex flex-col">{children}</div>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="self-center"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {dictionary.action.more}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
