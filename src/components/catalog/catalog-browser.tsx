"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FilterBar, ORDERINGS, type CatalogFilters } from "@/components/catalog/filter-bar";
import { TitleGrid } from "@/components/catalog/title-grid";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { StateBlock } from "@/components/feedback/state-block";
import { useCatalogList } from "@/hooks/use-catalog";
import { dictionary } from "@/lib/i18n/dictionary";
import type { AgeRating } from "@/lib/api/types";
import type { TitleKind } from "@/lib/domain/models";

const DEFAULT_ORDERING = ORDERINGS[0].value;

export interface CatalogBrowserProps {
  kind: TitleKind;
}

/**
 * The filterable catalogue.
 *
 * Filter state lives in the URL, not in component state: a filtered catalogue
 * is a shareable address, back/forward work, and the server can render the same
 * view. React Query keys off the same params, so paging is additive.
 */
export function CatalogBrowser({ kind }: CatalogBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: CatalogFilters = useMemo(
    () => ({
      ageRating: (searchParams.get("age") as AgeRating | null) ?? null,
      ordering: searchParams.get("sort") ?? DEFAULT_ORDERING,
    }),
    [searchParams],
  );

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

  const query = useCatalogList(kind, {
    ordering: filters.ordering,
    age_rating: filters.ageRating ?? undefined,
  });

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={reset}
        summary={query.data ? dictionary.catalog.found(query.data.total) : undefined}
      />

      {query.isPending ? (
        <TitleGridSkeleton />
      ) : query.isError ? (
        <StateBlock
          title={dictionary.error.offline}
          hint={dictionary.error.offlineHint}
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              {dictionary.action.retry}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <StateBlock
          title={dictionary.empty.search}
          hint={dictionary.empty.searchHint}
          action={
            <Button variant="secondary" onClick={reset}>
              {dictionary.action.reset}
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
                {dictionary.action.more}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
