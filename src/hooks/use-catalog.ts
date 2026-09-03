"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { catalogService } from "@/lib/api/services/catalog.service";
import { queryKeys } from "@/lib/api/query-keys";
import type { CatalogListParams } from "@/lib/api/types";
import type { Page, TitleKind, TitleSummary } from "@/lib/domain/models";

function listFor(kind: TitleKind) {
  return kind === "movie"
    ? catalogService.listMovies.bind(catalogService)
    : catalogService.listSeries.bind(catalogService);
}

function keyFor(kind: TitleKind, params: CatalogListParams) {
  return kind === "movie" ? queryKeys.movies.list(params) : queryKeys.series.list(params);
}

/**
 * Paginated catalog listing with "показать ещё" semantics. Server components
 * render page 1; this takes over as soon as the user filters or paginates.
 */
export function useCatalogList(kind: TitleKind, params: CatalogListParams) {
  return useInfiniteQuery({
    queryKey: keyFor(kind, params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listFor(kind)({ ...params, page: pageParam }),
    getNextPageParam: (lastPage: Page<TitleSummary>, allPages) =>
      lastPage.hasNext ? allPages.length + 1 : undefined,
    select: (data) => ({
      items: data.pages.flatMap((page) => page.items),
      total: data.pages[0]?.total ?? 0,
    }),
  });
}

/**
 * Everything in the catalogue, both kinds merged. Used as the resting state of
 * the search page: an empty search box over an empty page is a dead end, so it
 * shows what there is to search through instead.
 */
export function useCatalogBrowse(params: CatalogListParams = {}) {
  return useQuery({
    queryKey: queryKeys.search("", params),
    queryFn: () => catalogService.searchTitles("", params),
  });
}

/** Search hits across both kinds, merged. Disabled until the query is meaningful. */
export function useTitleSearch(query: string, params: CatalogListParams = {}) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.search(trimmed, params),
    queryFn: () => catalogService.searchTitles(trimmed, params),
    enabled: trimmed.length >= 2,
    placeholderData: (previous) => previous,
  });
}
