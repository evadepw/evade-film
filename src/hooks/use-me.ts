"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { meService } from "@/lib/api/services/me.service";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuth } from "@/providers/auth-provider";
import type { HistoryListParams, SearchParams, WatchlistListParams } from "@/lib/api/types";
import type { Page } from "@/lib/domain/models";

/**
 * The viewer's own collections.
 *
 * Every list here is paginated the same way the catalogue is, so they share the
 * «показать ещё» shape: an infinite query flattened to `items` plus the total.
 */
function usePagedList<TParams extends SearchParams, TItem>(
  queryKey: readonly unknown[],
  load: (params: TParams) => Promise<Page<TItem>>,
  params: TParams,
) {
  const { isAuthenticated } = useAuth();

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => load({ ...params, page: pageParam }),
    getNextPageParam: (lastPage: Page<TItem>, allPages) =>
      lastPage.hasNext ? allPages.length + 1 : undefined,
    enabled: isAuthenticated,
    select: (data) => ({
      items: data.pages.flatMap((page) => page.items),
      total: data.pages[0]?.total ?? 0,
    }),
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: isAuthenticated && query.isLoading,
    isError: query.isError,
    hasMore: Boolean(query.hasNextPage),
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
  };
}

export function useMyRatings(params: SearchParams = {}) {
  return usePagedList(queryKeys.me.ratings(params), meService.ratings, params);
}

export function useMyComments(params: SearchParams = {}) {
  return usePagedList(queryKeys.me.comments(params), meService.comments, params);
}

export function useMyWatchlist(params: WatchlistListParams = {}) {
  return usePagedList(queryKeys.me.watchlist(params), meService.watchlist, params);
}

export function useMyHistory(params: HistoryListParams = {}) {
  return usePagedList(queryKeys.me.history(params), meService.history, params);
}

/**
 * The «Продолжить просмотр» rail. Short `staleTime`: the viewer may have just
 * come back from the player, and a stale row there is immediately visible.
 */
export function useContinueWatching() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.me.continueWatching,
    queryFn: () => meService.continueWatching(),
    enabled: isAuthenticated,
    staleTime: 10_000,
  });
}
