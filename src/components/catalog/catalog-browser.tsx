"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/catalog/filter-bar";
import { TitleGrid } from "@/components/catalog/title-grid";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { StateBlock } from "@/components/feedback/state-block";
import { useCatalogList } from "@/hooks/use-catalog";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import {
  DEFAULT_ORDERING,
  parseFilters,
  toListParams,
  type CatalogFilters,
} from "@/lib/catalog-filters";
import type { Page, TitleKind, TitleSummary } from "@/lib/domain/models";

export interface CatalogBrowserProps {
  kind: TitleKind;
  /**
   * Page one, already resolved by the server for the filters in the request.
   * Null when that fetch failed — the browser then loads it itself.
   */
  initialPage?: Page<TitleSummary> | null;
}

/**
 * The filterable catalogue.
 *
 * Filter state lives in the URL, not in component state: a filtered catalogue
 * is a shareable address, back/forward work, and the server can render the same
 * view. React Query keys off the same params, so paging is additive.
 */
export function CatalogBrowser({ kind, initialPage }: CatalogBrowserProps) {
  const t = useDictionary();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: CatalogFilters = useMemo(() => parseFilters(searchParams), [searchParams]);

  /**
   * The filters the server rendered `initialPage` for. It is only page one of
   * *those* — once the viewer changes a filter the query key moves on, and
   * handing the same page to the new key would show the old grid under the new
   * heading.
   */
  const [serverFilters] = useState(filters);
  const seeded =
    filters.ageRating === serverFilters.ageRating &&
    filters.ordering === serverFilters.ordering;

  const setFilters = useCallback(
    (next: Partial<CatalogFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.ageRating) params.set("age", merged.ageRating);
      if (merged.ordering !== DEFAULT_ORDERING) params.set("sort", merged.ordering);
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const query = useCatalogList(kind, toListParams(filters), seeded ? initialPage : null);

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={reset}
        summary={query.data ? t.catalog.found(query.data.total) : undefined}
      />

      {query.isPending ? (
        <TitleGridSkeleton />
      ) : query.isError ? (
        <StateBlock
          title={t.error.offline}
          hint={t.error.offlineHint}
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              {t.action.retry}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <StateBlock
          title={t.empty.search}
          hint={t.empty.searchHint}
          action={
            <Button variant="secondary" onClick={reset}>
              {t.action.reset}
            </Button>
          }
        />
      ) : (
        <>
          <TitleGrid items={items} />
          {query.hasNextPage ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {t.action.more}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
