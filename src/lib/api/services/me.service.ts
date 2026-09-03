import { get } from "@/lib/api/http";
import { endpoints } from "@/lib/api/endpoints";
import type {
  HistoryListParams,
  MyCommentDto,
  PaginatedDto,
  RatingDto,
  SearchParams,
  WatchHistoryDto,
  WatchlistItemDto,
  WatchlistListParams,
} from "@/lib/api/types";
import {
  mapMyComment,
  mapPage,
  mapUserRating,
  mapWatchEntry,
  mapWatchlistEntry,
} from "@/lib/domain/mappers";
import type { MyComment, Page, UserRating, WatchEntry, WatchlistEntry } from "@/lib/domain/models";

/**
 * The signed-in viewer's own collections — the five `/api/v1/me/` lists.
 *
 * Every one of them carries a `content` card, so a row renders without a second
 * lookup in the catalogue.
 */
export const meService = {
  async ratings(params: SearchParams = {}): Promise<Page<UserRating>> {
    const dto = await get<PaginatedDto<RatingDto>>(endpoints.me.ratings, { params });
    return mapPage(dto, mapUserRating);
  },

  async comments(params: SearchParams = {}): Promise<Page<MyComment>> {
    const dto = await get<PaginatedDto<MyCommentDto>>(endpoints.me.comments, { params });
    return mapPage(dto, mapMyComment);
  },

  /** Filter by `status`, or `favorite: true` for the starred subset. */
  async watchlist(params: WatchlistListParams = {}): Promise<Page<WatchlistEntry>> {
    const dto = await get<PaginatedDto<WatchlistItemDto>>(endpoints.me.watchlist, { params });
    return mapPage(dto, mapWatchlistEntry);
  },

  async history(params: HistoryListParams = {}): Promise<Page<WatchEntry>> {
    const dto = await get<PaginatedDto<WatchHistoryDto>>(endpoints.me.history, { params });
    return mapPage(dto, mapWatchEntry);
  },

  /**
   * Unfinished videos, most recently touched first — the rail the home page
   * opens with. Entries under 1 % are dropped by the backend, so a misclick
   * does not park itself at the top of someone's home page.
   */
  async continueWatching(params: SearchParams = {}): Promise<Page<WatchEntry>> {
    const dto = await get<PaginatedDto<WatchHistoryDto>>(endpoints.me.continueWatching, {
      params,
    });
    return mapPage(dto, mapWatchEntry);
  },
};
