"use client";

import { useCallback, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  interactionsService,
  type ResumableType,
  type ShelvableType,
} from "@/lib/api/services/interactions.service";
import { queryKeys } from "@/lib/api/query-keys";
import { applyVote } from "@/lib/ratings";
import { useAuth } from "@/providers/auth-provider";
import type { CommentOrdering, CommentUpdateDto, WatchlistWriteDto } from "@/lib/api/types";
import type {
  Comment,
  CommentThread,
  ContentType,
  Page,
  RatingSummary,
  WatchlistStatus,
} from "@/lib/domain/models";

/**
 * Per-title interactions.
 *
 * All of it is client-side: the token never reaches a server render (see
 * `lib/api/tokens.ts`), so the rating widget, the shelf button and the comment
 * thread hydrate after the page rather than arriving with it.
 *
 * The rating summary and the comment list are public — they load for signed-out
 * visitors too, just without `my_rating` and without a reply box.
 */

/* --- Ratings -------------------------------------------------------------- */

export function useRating(type: ContentType, id: number, initial?: RatingSummary) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const queryKey = queryKeys.interactions.rating(type, id);

  const query = useQuery({
    queryKey,
    queryFn: () => interactionsService.getRating(type, id),
    // `my_rating` is per-viewer, so a summary cached for an anonymous visitor
    // must not be reused after they sign in — the auth provider drops it.
    staleTime: 30_000,
    // The catalog already sent the average with the page. Showing it as
    // placeholder — not `initialData` — keeps the request: only it knows
    // `my_rating` and the histogram.
    placeholderData: initial,
  });

  /**
   * Votes are numbered so that a slow response cannot overwrite a faster later
   * one — clicking 6 then 8 must settle on 8 whichever reply lands last.
   */
  const vote = useRef(0);

  /** Draw the vote immediately; hand back what it replaced, to undo with. */
  const predict = async (value: number | null) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<RatingSummary>(queryKey);
    // Undefined while the placeholder is showing: nothing cached to amend yet,
    // so that first vote simply waits for the server.
    if (previous) queryClient.setQueryData(queryKey, applyVote(previous, value));
    return { previous, seq: (vote.current += 1) };
  };

  type VoteContext = { previous: RatingSummary | undefined; seq: number };

  // Generic in the variables so neither handler pins down what its mutation
  // takes — `clear` is called with no argument, `rate` with a score.
  const settle = <V>(summary: RatingSummary, _input: V, context?: VoteContext) => {
    if (context && context.seq !== vote.current) return;
    queryClient.setQueryData(queryKey, summary);
  };

  const undo = <V>(_error: unknown, _input: V, context?: VoteContext) => {
    if (context && context.seq !== vote.current) return;
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    void queryClient.invalidateQueries({ queryKey });
  };

  const rate = useMutation({
    mutationFn: (value: number) => interactionsService.rate(type, id, value),
    onMutate: (value) => predict(value),
    onSuccess: settle,
    onError: undo,
  });

  const clear = useMutation({
    mutationFn: () => interactionsService.clearRating(type, id),
    onMutate: () => predict(null),
    onSuccess: settle,
    onError: undo,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    canRate: isAuthenticated,
    isSaving: rate.isPending || clear.isPending,
    /** Sending the score already given clears it — the same star toggles. */
    setRating: useCallback(
      (value: number) => {
        if (query.data?.myRating === value) return clear.mutateAsync();
        return rate.mutateAsync(value);
      },
      [query.data?.myRating, rate, clear],
    ),
  };
}

/* --- Watchlist ------------------------------------------------------------ */

/**
 * The two fields the shelf control draws, split out from the stored row.
 *
 * It is deliberately *not* a `WatchlistEntry`: shelving a title for the first
 * time has to render before the server has assigned an id or echoed back the
 * content it points at, and inventing those to satisfy the wider type would put
 * a row in the cache that claims to be something it is not.
 */
export interface ShelfState {
  status: WatchlistStatus;
  isFavorite: boolean;
}

export function useWatchlist(type: ShelvableType, id: number) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const queryKey = queryKeys.interactions.watchlist(type, id);

  const query = useQuery({
    queryKey,
    queryFn: () => interactionsService.getWatchlistEntry(type, id),
    enabled: isAuthenticated,
  });

  const invalidateLists = () => queryClient.invalidateQueries({ queryKey: queryKeys.me.all });

  const save = useMutation({
    mutationFn: (input: WatchlistWriteDto) =>
      interactionsService.saveWatchlistEntry(type, id, input),
    onSuccess: (entry) => {
      queryClient.setQueryData(queryKey, entry);
      void invalidateLists();
    },
  });

  const remove = useMutation({
    mutationFn: () => interactionsService.removeWatchlistEntry(type, id),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null);
      void invalidateLists();
    },
  });

  const stored = query.data ?? null;

  /**
   * What the control draws now. While a write is in flight that is the write's
   * own outcome rather than the row it replaces, so the star fills and the
   * status label changes under the finger instead of a round trip later.
   *
   * No rollback to write: a failed mutation stops being pending, `stored`
   * reappears by itself, and the caller has already raised the toast. The
   * backend defaults a new row to «planned», which is the default mirrored here.
   */
  const shelf: ShelfState | null = remove.isPending
    ? null
    : save.isPending
      ? {
          status: save.variables.status ?? stored?.status ?? "planned",
          isFavorite: save.variables.is_favorite ?? stored?.isFavorite ?? false,
        }
      : stored;

  return {
    shelf,
    isLoading: isAuthenticated && query.isLoading,
    isSaving: save.isPending || remove.isPending,
    isShelved: Boolean(shelf),
    /** Status and «избранное» share one row, so both go through the same upsert. */
    setStatus: useCallback((status: WatchlistStatus) => save.mutateAsync({ status }), [save]),
    toggleFavorite: useCallback(
      () => save.mutateAsync({ is_favorite: !shelf?.isFavorite }),
      [save, shelf?.isFavorite],
    ),
    add: useCallback(() => save.mutateAsync({}), [save]),
    remove: useCallback(() => remove.mutateAsync(), [remove]),
  };
}

/* --- Comments ------------------------------------------------------------- */

type CommentPages = InfiniteData<Page<CommentThread>, number>;

/** Applies an edit to one comment wherever it sits — thread root or reply. */
function patchComment(
  pages: CommentPages | undefined,
  commentId: number,
  update: (comment: Comment) => Comment,
): CommentPages | undefined {
  if (!pages) return pages;

  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.map((thread) =>
        thread.id === commentId
          ? { ...update(thread), replies: thread.replies }
          : {
              ...thread,
              replies: thread.replies.map((reply) =>
                reply.id === commentId ? update(reply) : reply,
              ),
            },
      ),
    })),
  };
}

export function useComments(type: ContentType, id: number, ordering: CommentOrdering = "new") {
  const queryClient = useQueryClient();
  const { viewer } = useAuth();
  const queryKey = queryKeys.interactions.comments(type, id, { ordering });

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      interactionsService.listComments(type, id, { ordering, page: pageParam }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNext ? allPages.length + 1 : undefined,
    select: (data) => ({
      items: data.pages.flatMap((page) => page.items),
      total: data.pages[0]?.total ?? 0,
    }),
  });

  /** A new comment reorders and re-paginates the thread, so it is refetched whole. */
  const reload = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.interactions.comments(type, id, { ordering }),
      }),
    [queryClient, type, id, ordering],
  );

  const add = useMutation({
    mutationFn: (input: { body: string; isSpoiler?: boolean; parentId?: number | null }) =>
      interactionsService.addComment(type, id, {
        body: input.body,
        is_spoiler: input.isSpoiler,
        parent: input.parentId ?? undefined,
      }),
    onSuccess: () => {
      void reload();
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
    },
  });

  const edit = useMutation({
    mutationFn: (input: { commentId: number } & CommentUpdateDto) =>
      interactionsService.editComment(input.commentId, {
        body: input.body,
        is_spoiler: input.is_spoiler,
      }),
    onSuccess: (_result, input) => {
      queryClient.setQueryData<CommentPages>(queryKey, (pages) =>
        patchComment(pages, input.commentId, (comment) => ({
          ...comment,
          body: input.body ?? comment.body,
          isSpoiler: input.is_spoiler ?? comment.isSpoiler,
          isEdited: true,
        })),
      );
    },
  });

  const remove = useMutation({
    mutationFn: (commentId: number) => interactionsService.deleteComment(commentId),
    // Deletion is soft — the row stays as a tombstone when it holds replies,
    // and disappears when it does not. Only the server knows which, so refetch.
    onSuccess: () => void reload(),
  });

  const react = useMutation({
    mutationFn: (input: { commentId: number; value: 1 | -1 }) =>
      interactionsService.reactToComment(input.commentId, input.value),
    // A vote on a comment is a toggle the client can resolve on its own, and
    // the counter sits directly under the cursor — the one place where a
    // round trip's delay is unmissable.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentPages>(queryKey);

      queryClient.setQueryData<CommentPages>(queryKey, (pages) =>
        patchComment(pages, input.commentId, (comment) => {
          // Pressing the reaction already held withdraws it, as the API does.
          const next = comment.myReaction === input.value ? null : input.value;
          const shift = (side: 1 | -1) => (next === side ? 1 : 0) - (comment.myReaction === side ? 1 : 0);

          return {
            ...comment,
            likes: comment.likes + shift(1),
            dislikes: comment.dislikes + shift(-1),
            myReaction: next,
          };
        }),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (result, input) => {
      queryClient.setQueryData<CommentPages>(queryKey, (pages) =>
        patchComment(pages, input.commentId, (comment) => ({
          ...comment,
          likes: result.likes,
          dislikes: result.dislikes,
          myReaction: result.myReaction,
        })),
      );
    },
  });

  return {
    comments: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    isLoadingMore: query.isFetchingNextPage,
    /** Signed in and not comment-banned. */
    canPost: Boolean(viewer) && !viewer?.isCommentBanned,
    isBanned: Boolean(viewer?.isCommentBanned),
    viewerId: viewer?.id ?? null,
    isStaff: Boolean(viewer?.isStaff),
    add,
    edit,
    remove,
    react,
  };
}

/* --- Watch progress ------------------------------------------------------- */

/**
 * The resume point for one video. Read once when the player mounts; writes are
 * driven by the player's own save timer, so they are exposed as a plain
 * function rather than a mutation with pending state — a progress ping that
 * fails is not something the viewer should be told about.
 */
export function useWatchProgress(type: ResumableType, id: number) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const queryKey = queryKeys.interactions.progress(type, id);

  const query = useQuery({
    queryKey,
    queryFn: () => interactionsService.getProgress(type, id),
    enabled: isAuthenticated,
    // The resume prompt is decided once, on mount: re-reading mid-playback
    // would fight the position the player is currently writing.
    staleTime: Infinity,
    gcTime: 0,
  });

  const save = useCallback(
    async (position: number, duration: number | null, isFinished?: boolean) => {
      if (!isAuthenticated) return;
      try {
        await interactionsService.saveProgress(type, id, {
          position_seconds: Math.max(0, Math.round(position)),
          duration_seconds: duration && duration > 0 ? Math.round(duration) : undefined,
          is_finished: isFinished,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.me.continueWatching });
      } catch {
        // A dropped ping is recoverable — the next tick carries a later position.
      }
    },
    [isAuthenticated, type, id, queryClient],
  );

  return {
    entry: query.data ?? null,
    /** False for a signed-out viewer: nothing is stored server-side for them. */
    isTracking: isAuthenticated,
    save,
  };
}

/* --- Views ---------------------------------------------------------------- */

/**
 * Counting a view is fire-and-forget and works for anonymous visitors too. The
 * backend deduplicates per visitor per day, so a reload costs nothing.
 */
export function useViewCounter(type: ContentType, id: number) {
  return useCallback(() => {
    void interactionsService.countView(type, id).catch(() => {
      // A view that is not counted is not worth an error state.
    });
  }, [type, id]);
}
