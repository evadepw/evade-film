"use client";

import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";

import { catalogService } from "@/lib/api/services/catalog.service";
import { useLocale } from "@/lib/i18n/dictionary-context";
import { queryKeys } from "@/lib/api/query-keys";
import type { CatalogListParams } from "@/lib/api/types";
import type { Page, TitleKind, TitleSummary } from "@/lib/domain/models";

function listFor(kind: TitleKind) {
  return kind === "movie"
    ? catalogService.listMovies.bind(catalogService)
    : catalogService.listSeries.bind(catalogService);
}

/**
 * The locale reaches the mappers as well as the copy: a title's `href` carries
 * the language prefix, so a list fetched without one would hand an English
 * reader links back into Russian.
 */

function keyFor(kind: TitleKind, params: CatalogListParams) {
  return kind === "movie" ? queryKeys.movies.list(params) : queryKeys.series.list(params);
}

/**
 * Paginated catalog listing with "показать ещё" semantics. Server components
 * render page 1; this takes over as soon as the user filters or paginates.
 *
 * `initialPage` is that server-rendered page. Seeding it rather than fetching
 * again is what puts the grid in the HTML: without it the first client render
 * is `isPending`, the markup a crawler receives is a skeleton, and the viewer
 * waits a round trip after hydration for titles the server already had.
 *
 * The caller is responsible for passing it only alongside the params it was
 * fetched with — React Query attaches it to whatever key is current.
 */
export function useCatalogList(
  kind: TitleKind,
  params: CatalogListParams,
  initialPage?: Page<TitleSummary> | null,
) {
  const locale = useLocale();

  return useInfiniteQuery({
    queryKey: [...keyFor(kind, params), locale],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listFor(kind)({ ...params, page: pageParam }, locale),
    initialData: initialPage
      ? ({ pages: [initialPage], pageParams: [1] } satisfies InfiniteData<
          Page<TitleSummary>,
          number
        >)
      : undefined,
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
  const locale = useLocale();

  return useQuery({
    queryKey: [...queryKeys.search("", params), locale],
    queryFn: () => catalogService.searchTitles("", params, locale),
  });
}

/** Search hits across both kinds, merged. Disabled until the query is meaningful. */
export function useTitleSearch(query: string, params: CatalogListParams = {}) {
  const trimmed = query.trim();

  const locale = useLocale();

  return useQuery({
    queryKey: [...queryKeys.search(trimmed, params), locale],
    queryFn: () => catalogService.searchTitles(trimmed, params, locale),
    enabled: trimmed.length >= 2,
    placeholderData: (previous) => previous,
  });
}
