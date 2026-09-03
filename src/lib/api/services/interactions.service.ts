import { del, get, patch, post, put } from "@/lib/api/http";
import { endpoints, type ContentPathSegment } from "@/lib/api/endpoints";
import type {
  CommentListParams,
  CommentReactionResultDto,
  CommentThreadDto,
  CommentUpdateDto,
  CommentWriteDto,
  PaginatedDto,
  RatingSummaryDto,
  ViewCountDto,
  WatchHistoryDto,
  WatchProgressWriteDto,
  WatchlistItemDto,
  WatchlistWriteDto,
} from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";
import {
  mapCommentThread,
  mapPage,
  mapRatingSummary,
  mapViewCount,
  mapWatchEntry,
  mapWatchlistEntry,
} from "@/lib/domain/mappers";
import type {
  CommentThread,
  ContentType,
  Page,
  RatingSummary,
  Reaction,
  ViewCount,
  WatchEntry,
  WatchlistEntry,
} from "@/lib/domain/models";

/**
 * Domain type → the path segment the API uses for it. `as const satisfies`
 * rather than an annotation: the literal per key has to survive so the narrowed
 * unions below still narrow the endpoint builders.
 */
const SEGMENTS = {
  movie: "movies",
  series: "series",
  episode: "episodes",
} as const satisfies Record<ContentType, ContentPathSegment>;

/** Content types that can be shelved. An episode is shelved through its series. */
export type ShelvableType = Extract<ContentType, "movie" | "series">;
/** Content types that have a resume point. A series keeps its position per episode. */
export type ResumableType = Extract<ContentType, "movie" | "episode">;

/**
 * Ratings, comments, views, watchlist and progress.
 *
 * Everything here is per-content-object, so each call takes the type alongside
 * the id. The two narrower unions above are the schema's own gaps, lifted into
 * the type system: a call the backend has no route for will not compile.
 *
 * `null` rather than a throw is used for "the viewer has no row yet" — the API
 * spells that 404, and it is an ordinary state, not a failure.
 */
export const interactionsService = {
  /* --- Ratings ----------------------------------------------------------- */

  async getRating(type: ContentType, id: number | string): Promise<RatingSummary> {
    const dto = await get<RatingSummaryDto>(endpoints.interactions.rating(SEGMENTS[type], id));
    return mapRatingSummary(dto);
  },

  /** Upsert: one score per viewer per object, 0–10. Returns the refreshed summary. */
  async rate(type: ContentType, id: number | string, value: number): Promise<RatingSummary> {
    const dto = await put<RatingSummaryDto>(endpoints.interactions.rating(SEGMENTS[type], id), {
      value,
    });
    return mapRatingSummary(dto);
  },

  async clearRating(type: ContentType, id: number | string): Promise<RatingSummary> {
    const dto = await del<RatingSummaryDto>(endpoints.interactions.rating(SEGMENTS[type], id));
    return mapRatingSummary(dto);
  },

  /* --- Views ------------------------------------------------------------- */

  /**
   * Counts one view, anonymous visitors included. Deduplicated per visitor per
   * day, so it is called when playback starts rather than on page load — a
   * count that means «watched» is worth more than one that means «opened».
   */
  async countView(type: ContentType, id: number | string): Promise<ViewCount> {
    const dto = await post<ViewCountDto>(endpoints.interactions.view(SEGMENTS[type], id));
    return mapViewCount(dto);
  },

  /* --- Comments ---------------------------------------------------------- */

  async listComments(
    type: ContentType,
    id: number | string,
    params: CommentListParams = {},
  ): Promise<Page<CommentThread>> {
    const dto = await get<PaginatedDto<CommentThreadDto>>(
      endpoints.interactions.comments(SEGMENTS[type], id),
      { params },
    );
    return mapPage(dto, mapCommentThread);
  },

  /** `parent` makes it a reply; the backend re-parents a reply to a reply. */
  async addComment(
    type: ContentType,
    id: number | string,
    input: CommentWriteDto,
  ): Promise<CommentThread> {
    const dto = await post<CommentThreadDto>(
      endpoints.interactions.comments(SEGMENTS[type], id),
      input,
    );
    return mapCommentThread(dto);
  },

  async editComment(commentId: number, input: CommentUpdateDto): Promise<void> {
    await patch<CommentUpdateDto>(endpoints.comments.detail(commentId), input);
  },

  /** Soft delete: the body is cleared, the row stays so replies survive. */
  async deleteComment(commentId: number): Promise<void> {
    await del<void>(endpoints.comments.detail(commentId));
  },

  /** Sending the reaction you already hold clears it — the same button toggles. */
  async reactToComment(
    commentId: number,
    value: 1 | -1,
  ): Promise<{ likes: number; dislikes: number; myReaction: Reaction }> {
    const dto = await post<CommentReactionResultDto>(endpoints.comments.react(commentId), {
      value,
    });
    return {
      likes: dto.likes,
      dislikes: dto.dislikes,
      myReaction: dto.my_reaction === 1 || dto.my_reaction === -1 ? dto.my_reaction : null,
    };
  },

  /* --- Watchlist --------------------------------------------------------- */

  /** `null` when the title is not on the list. */
  async getWatchlistEntry(
    type: ShelvableType,
    id: number | string,
  ): Promise<WatchlistEntry | null> {
    return orNull(
      get<WatchlistItemDto>(endpoints.interactions.watchlist(SEGMENTS[type], id)).then(
        mapWatchlistEntry,
      ),
    );
  },

  /**
   * Upsert. Status and `is_favorite` share one row on purpose: starring
   * something you are already watching should not fork into a second entry.
   */
  async saveWatchlistEntry(
    type: ShelvableType,
    id: number | string,
    input: WatchlistWriteDto,
  ): Promise<WatchlistEntry> {
    const dto = await put<WatchlistItemDto>(
      endpoints.interactions.watchlist(SEGMENTS[type], id),
      input,
    );
    return mapWatchlistEntry(dto);
  },

  async removeWatchlistEntry(type: ShelvableType, id: number | string): Promise<void> {
    await del<void>(endpoints.interactions.watchlist(SEGMENTS[type], id));
  },

  /* --- Watch progress ---------------------------------------------------- */

  /** `null` when this viewer has never played it. */
  async getProgress(type: ResumableType, id: number | string): Promise<WatchEntry | null> {
    return orNull(
      get<WatchHistoryDto>(endpoints.interactions.progress(SEGMENTS[type], id)).then(mapWatchEntry),
    );
  },

  /**
   * Upsert of the resume point — one row per viewer per video, so it is safe to
   * call on the player's save timer. Past 90 % the backend flips `is_finished`.
   */
  async saveProgress(
    type: ResumableType,
    id: number | string,
    input: WatchProgressWriteDto,
  ): Promise<WatchEntry> {
    const dto = await put<WatchHistoryDto>(
      endpoints.interactions.progress(SEGMENTS[type], id),
      input,
    );
    return mapWatchEntry(dto);
  },

  async clearProgress(type: ResumableType, id: number | string): Promise<void> {
    await del<void>(endpoints.interactions.progress(SEGMENTS[type], id));
  },
};

/**
 * «Not on the list» and «never watched» are 404s in the schema. They are states,
 * not failures, so they become `null` here instead of reaching an error boundary.
 */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}
