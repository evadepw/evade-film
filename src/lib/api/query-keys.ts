import type {
  CatalogListParams,
  CommentListParams,
  HistoryListParams,
  PlaybackParams,
  SearchParams,
  WatchlistListParams,
} from "./types";
import type { ContentType } from "@/lib/domain/models";

/**
 * React Query cache keys, hierarchical so a whole branch can be invalidated at
 * once (`queryClient.invalidateQueries({ queryKey: queryKeys.movies.all })`).
 */
export const queryKeys = {
  branding: ["branding"] as const,

  movies: {
    all: ["movies"] as const,
    list: (params: CatalogListParams) => ["movies", "list", params] as const,
    detail: (id: number | string) => ["movies", "detail", id] as const,
    playback: (id: number | string, params: PlaybackParams) =>
      ["movies", "playback", id, params] as const,
  },

  series: {
    all: ["series"] as const,
    list: (params: CatalogListParams) => ["series", "list", params] as const,
    detail: (id: number | string) => ["series", "detail", id] as const,
    playback: (id: number | string, params: PlaybackParams) =>
      ["series", "playback", id, params] as const,
  },

  search: (query: string, params: CatalogListParams) => ["search", query, params] as const,

  /**
   * Everything below depends on who is signed in. The viewer id is *not* part
   * of the keys — signing out clears the whole cache instead, which is the only
   * way to be sure nothing of the previous session survives in it.
   */
  viewer: ["viewer"] as const,

  profile: (username: string) => ["profile", username] as const,

  interactions: {
    all: ["interactions"] as const,
    rating: (type: ContentType, id: number | string) =>
      ["interactions", "rating", type, id] as const,
    comments: (type: ContentType, id: number | string, params: CommentListParams) =>
      ["interactions", "comments", type, id, params] as const,
    watchlist: (type: ContentType, id: number | string) =>
      ["interactions", "watchlist", type, id] as const,
    progress: (type: ContentType, id: number | string) =>
      ["interactions", "progress", type, id] as const,
  },

  me: {
    all: ["me"] as const,
    ratings: (params: SearchParams) => ["me", "ratings", params] as const,
    comments: (params: SearchParams) => ["me", "comments", params] as const,
    watchlist: (params: WatchlistListParams) => ["me", "watchlist", params] as const,
    history: (params: HistoryListParams) => ["me", "history", params] as const,
    continueWatching: ["me", "continue-watching"] as const,
  },
} as const;
