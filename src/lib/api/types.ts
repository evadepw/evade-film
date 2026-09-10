/**
 * Wire types for the EvadeSite Catalog API (`/api/v1`).
 *
 * These mirror the OpenAPI schema one-to-one and are deliberately kept "dumb":
 * snake_case, nullable exactly where the backend is nullable, no derived
 * fields. Everything the UI actually renders goes through `lib/domain/mappers`,
 * so a backend rename is a one-file change here plus one in the mapper.
 */

export type AgeRating = "0+" | "6+" | "12+" | "16+" | "18+";

export type VideoCodec = "av1" | "h264" | "h265";

/** Translated fields keyed by BCP-47 language code. Every field is optional. */
export type TranslationsDto<TFields extends string = TitleTranslationField> = Record<
  string,
  Partial<Record<TFields, string>> | undefined
>;

export type TitleTranslationField = "title" | "description" | "short_description";
export type SeasonTranslationField = "title" | "description";

export interface PaginatedDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface OrganizationDto {
  id: number;
  name: string;
  translations: TranslationsDto<"tagline">;
  logo: string | null;
  favicon: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  site_url: string | null;
  support_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceoverStudioDto {
  id: number;
  name: string;
  slug: string;
}

export interface VoiceoverTrackDto {
  id: number;
  studio: number | null;
  studio_name: string | null;
  /** BCP-47 language tag. The backend also emits ISO 639-2 (`rus`) in places. */
  language: string;
  label: string;
  video_id: string | null;
}

export interface SubtitleTrackDto {
  id: number;
  language: string;
  label: string;
  file: string | null;
}

/**
 * Counters the catalog denormalises onto every title, so a card can show a
 * score without a second request. Read-only; the writes live under
 * `/interactions/`.
 */
export interface ContentStatsDto {
  /** Deduplicated views, anonymous visitors included. */
  views_count: number;
  /** Mean user score 0–10, or null when nobody has rated it. */
  rating_avg: number | null;
  rating_count: number;
  /** Visible comments only — tombstones and unapproved ones are not counted. */
  comment_count: number;
}

export interface MovieListDto extends ContentStatsDto {
  id: number;
  title: string;
  original_title: string;
  poster: string | null;
  year: number | null;
  age_rating: AgeRating | null;
  country: string;
  /** Minutes. */
  duration: number | null;
  is_published: boolean;
  created_at: string;
}

export interface MovieDetailDto extends ContentStatsDto {
  id: number;
  translations: TranslationsDto;
  original_title: string;
  poster: string | null;
  backdrop: string | null;
  trailer_url: string | null;
  year: number | null;
  age_rating: AgeRating | null;
  country: string;
  duration: number | null;
  video_id: string | null;
  voiceover_tracks: VoiceoverTrackDto[];
  subtitle_tracks: SubtitleTrackDto[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeriesListDto extends ContentStatsDto {
  id: number;
  title: string;
  original_title: string;
  poster: string | null;
  year: number | null;
  age_rating: AgeRating | null;
  country: string;
  season_count: number;
  is_published: boolean;
  created_at: string;
}

/** The episode tree carries only the view counter, not the rating aggregates. */
export interface EpisodeTreeDto {
  id: number;
  number: number;
  translations: TranslationsDto<"title" | "description">;
  duration: number | null;
  thumbnail: string | null;
  is_published: boolean;
  views_count: number;
}

export interface SeasonTreeDto {
  id: number;
  number: number;
  translations: TranslationsDto<SeasonTranslationField>;
  year: number | null;
  episodes: EpisodeTreeDto[];
}

export interface SeriesDetailDto extends ContentStatsDto {
  id: number;
  translations: TranslationsDto;
  original_title: string;
  poster: string | null;
  backdrop: string | null;
  trailer_url: string | null;
  year: number | null;
  age_rating: AgeRating | null;
  country: string;
  seasons: SeasonTreeDto[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeasonListDto {
  id: number;
  number: number;
  translations: TranslationsDto<SeasonTranslationField>;
  year: number | null;
  episode_count: number;
}

export interface EpisodeListDto extends ContentStatsDto {
  id: number;
  number: number;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  is_published: boolean;
}

/** Short-lived signed manifest. Treat `manifest_url` as opaque and re-request it. */
export interface PlaybackDto {
  manifest_url: string;
  video_id: string;
}

export interface PlaybackTrackDto {
  id: number;
  studio: number | null;
  studio_name: string | null;
  language: string;
  label: string;
  audio_track_index: number;
  video_id: string | null;
  manifest_url: string | null;
}

export interface PlaybackPlayerVideoDto {
  id: number;
  video_id: string;
  manifest_url: string;
}

export interface PlaybackBatchEpisodeDto {
  id: number;
  number: number;
  video_id: string | null;
  manifest_url: string | null;
  player_videos: PlaybackPlayerVideoDto[];
  voiceover_tracks: PlaybackTrackDto[];
}

export interface PlaybackBatchSeasonDto {
  id: number;
  number: number;
  episodes: PlaybackBatchEpisodeDto[];
}

export interface PlaybackBatchDto {
  series: number;
  seasons: PlaybackBatchSeasonDto[];
}

/* --- Query parameters ---------------------------------------------------- */

export interface PaginationParams {
  page?: number;
}

export interface SearchParams extends PaginationParams {
  search?: string;
  ordering?: string;
  /** BCP-47 tag. List endpoints resolve translations before serialising. */
  lang?: string;
}

export interface CatalogListParams extends SearchParams {
  age_rating?: AgeRating;
  country?: string;
  year?: number;
  year_min?: number;
  year_max?: number;
}

export interface PlaybackParams {
  codec?: VideoCodec;
  voiceover_track?: number;
  subtitle_track?: number;
}

export interface SeriesPlaybackParams extends PlaybackParams {
  /** Season number (1-based), not a database id. */
  season?: number;
  /** Episode number within the season, not a database id. */
  episode?: number;
}

/* --- Accounts ------------------------------------------------------------ */

export type PreferredLanguage = "ru" | "en";

/** The signed-in account. `email` and the flags are read-only. */
export interface UserDto {
  id: number;
  email: string;
  username: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string;
  birth_date: string | null;
  preferred_language: PreferredLanguage;
  is_staff: boolean;
  /** Read-only: can still read, rate and watch, but not post. */
  is_comment_banned: boolean;
  date_joined: string;
}

/** Someone else's card: handle, name, avatar. Never an email. */
export interface PublicUserDto {
  id: number;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface TokenPairDto {
  access: string;
  refresh: string;
}

export interface AuthResponseDto extends TokenPairDto {
  user: UserDto;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  username?: string;
  password: string;
  password_confirm: string;
  preferred_language?: PreferredLanguage;
}

export interface ChangePasswordRequestDto {
  old_password: string;
  new_password: string;
}

/** The refresh endpoint takes a refresh token and, with rotation on, returns a new one. */
export interface TokenRefreshDto {
  access: string;
  refresh: string;
}

export type ProfileUpdateDto = Partial<
  Pick<UserDto, "username" | "first_name" | "last_name" | "bio" | "birth_date"> & {
    preferred_language: PreferredLanguage;
  }
>;

/* --- Interactions -------------------------------------------------------- */

/** What a rating, comment or history row points back at. */
export interface ContentRefDto {
  type: "movie" | "series" | "episode";
  id: number;
  title: string | null;
  poster: string | null;
  year: number | null;
  /** Episodes only. */
  series_id: number | null;
  season_number: number | null;
  episode_number: number | null;
}

export interface RatingSummaryDto {
  /** Mean score, or null when nobody has voted. */
  average: number | null;
  count: number;
  /** Vote counts keyed by score, `"0"`–`"10"`. */
  distribution: Record<string, number>;
  /** The caller's own score. Always null for anonymous callers. */
  my_rating: number | null;
}

export interface RatingWriteDto {
  /** 0–10. */
  value: number;
}

export interface RatingDto {
  id: number;
  value: number;
  content: ContentRefDto;
  created_at: string;
  updated_at: string;
}

export interface CommentDto {
  id: number;
  user: PublicUserDto;
  parent: number | null;
  /** Blank for tombstones — a deleted comment keeps its place but not its text. */
  body: string;
  is_spoiler: boolean;
  is_deleted: boolean;
  is_edited: boolean;
  likes: number;
  dislikes: number;
  /** 1, -1 or null. */
  my_reaction: number | null;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

/** A top-level comment with its replies inlined. Threads are one level deep. */
export interface CommentThreadDto extends CommentDto {
  replies: CommentDto[];
}

/** A comment of the signed-in user, carrying the title it was left on. */
export interface MyCommentDto extends CommentDto {
  content: ContentRefDto;
}

export interface CommentWriteDto {
  body: string;
  is_spoiler?: boolean;
  /** Replying to a reply re-parents to the thread root, server-side. */
  parent?: number | null;
}

export interface CommentUpdateDto {
  body?: string;
  is_spoiler?: boolean;
}

export interface CommentReactionDto {
  /** 1 likes, -1 dislikes. Sending the value you already hold clears it. */
  value: 1 | -1;
}

export interface CommentReactionResultDto {
  likes: number;
  dislikes: number;
  my_reaction: number | null;
}

export interface ViewCountDto {
  views_count: number;
  /** False when this visitor was already counted today. */
  counted: boolean;
}

export type WatchlistStatus = "planned" | "watching" | "completed" | "dropped";

export interface WatchlistItemDto {
  id: number;
  content: ContentRefDto;
  status: WatchlistStatus;
  status_display: string;
  is_favorite: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface WatchlistWriteDto {
  status?: WatchlistStatus;
  is_favorite?: boolean;
  note?: string;
}

export interface WatchHistoryDto {
  id: number;
  content: ContentRefDto;
  position_seconds: number;
  duration_seconds: number | null;
  /** 0–100, derived server-side from position/duration. */
  progress: number;
  is_finished: boolean;
  created_at: string;
  watched_at: string;
}

export interface WatchProgressWriteDto {
  position_seconds: number;
  duration_seconds?: number | null;
  /** Auto-set past 90% regardless; sent explicitly when the video ends. */
  is_finished?: boolean;
}

/* --- Interaction query parameters ---------------------------------------- */

export type CommentOrdering = "new" | "old" | "top";

export interface CommentListParams extends PaginationParams {
  ordering?: CommentOrdering;
  search?: string;
}

export interface WatchlistListParams extends SearchParams {
  status?: WatchlistStatus;
  favorite?: boolean;
}

export interface HistoryListParams extends SearchParams {
  finished?: boolean;
}

/* --- Collections --------------------------------------------------------- */

export type CollectionKind = "manual" | "dynamic";

/** Which resolver fills a dynamic collection. Blank on a manual one. */
export type CollectionSource = "new" | "popular" | "top_rated";

export type CollectionTranslationField = "title" | "description";

/**
 * A card inside a collection. Field-for-field the catalogue's own list rows
 * plus a `type` discriminator, which is what lets one collection hold both
 * kinds and still be mapped by the existing summary mappers.
 */
export interface CollectionMovieDto extends MovieListDto {
  type: "movie";
}

export interface CollectionSeriesDto extends SeriesListDto {
  type: "series";
}

export type CollectionEntryDto = CollectionMovieDto | CollectionSeriesDto;

/** A row of `/collections/`: one resolved title, cards only on request. */
export interface CollectionListDto {
  id: number;
  /** Stable key the frontend routes and caches on, e.g. `new-this-week`. */
  slug: string;
  title: string;
  description: string;
  kind: CollectionKind;
  /** Empty string on manual collections. */
  source: CollectionSource | "";
  poster: string | null;
  backdrop: string | null;
  /** Sort order on the home page — lower comes first. */
  position: number;
  /** The single featured collection. At most one carries it. */
  is_main: boolean;
  is_published: boolean;
  /** Null unless `expand=items` was asked for — not the same as empty. */
  items: CollectionEntryDto[] | null;
  created_at: string;
}

/** `/collections/{id}/`: the row above plus the writable translations dict. */
export interface CollectionDetailDto extends CollectionListDto {
  translations: TranslationsDto<CollectionTranslationField>;
  /** Dynamic only, e.g. `{ limit: 20, types: ["movie"], year_min: 2020 }`. */
  source_params: Record<string, unknown> | null;
  updated_at: string;
}

/** Shared by every collection read: how many cards to resolve, max 100. */
export interface CollectionItemsParams {
  items_limit?: number;
  /** Not in the schema; sent for parity with the catalogue's list endpoints. */
  lang?: string;
}

export interface CollectionListParams extends CollectionItemsParams, PaginationParams {
  /**
   * Inline every row's cards — one request for a whole home page instead of
   * one per rail. Omitted, `items` comes back null.
   */
  expand?: "items";
  ordering?: string;
  search?: string;
}
