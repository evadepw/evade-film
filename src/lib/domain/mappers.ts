import { localeRoutes } from "@/lib/routes";
import { DEFAULT_LOCALE, toLocale, languageName, translate } from "@/lib/i18n/locale";

/**
 * Last-resort title for a record with neither a translation nor an original.
 * Not translated: mappers run below the dictionary, and a title this broken is
 * a data fault to be fixed in the admin rather than copy to be maintained.
 */
const UNTITLED = "—";
import type {
  CommentDto,
  ContentStatsDto,
  CommentThreadDto,
  ContentRefDto,
  EpisodeTreeDto,
  MovieDetailDto,
  MovieListDto,
  MyCommentDto,
  OrganizationDto,
  PaginatedDto,
  PlaybackBatchDto,
  PlaybackDto,
  PublicUserDto,
  RatingDto,
  RatingSummaryDto,
  SeasonTreeDto,
  SeriesDetailDto,
  SeriesListDto,
  SubtitleTrackDto,
  UserDto,
  ViewCountDto,
  VoiceoverTrackDto,
  WatchHistoryDto,
  WatchlistItemDto,
} from "@/lib/api/types";
import type {
  AudioTrack,
  Branding,
  Comment,
  CommentThread,
  ContentRef,
  ContentStats,
  Episode,
  MyComment,
  Page,
  PlaybackSource,
  PublicProfile,
  RatingSummary,
  Reaction,
  Season,
  SeriesPlayback,
  SubtitleTrack,
  TitleDetail,
  TitleSummary,
  UserRating,
  Viewer,
  ViewCount,
  WatchEntry,
  WatchlistEntry,
} from "./models";

/** The four counters every catalog read carries, in domain spelling. */
function mapStats(dto: ContentStatsDto): ContentStats {
  return {
    rating: dto.rating_avg,
    ratingCount: dto.rating_count,
    commentCount: dto.comment_count,
    viewCount: dto.views_count,
  };
}

/** Empty strings are how the backend spells "not set". */
function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function mapPage<TDto, TModel>(
  dto: PaginatedDto<TDto>,
  map: (item: TDto) => TModel,
): Page<TModel> {
  return {
    items: dto.results.map(map),
    total: dto.count,
    hasNext: Boolean(dto.next),
    hasPrevious: Boolean(dto.previous),
  };
}

export function mapMovieSummary(
  dto: MovieListDto,
  locale: string = DEFAULT_LOCALE,
): TitleSummary {
  const routes = localeRoutes(toLocale(locale));
  return {
    ...mapStats(dto),
    id: dto.id,
    kind: "movie",
    title: nullIfBlank(dto.title) ?? nullIfBlank(dto.original_title) ?? UNTITLED,
    originalTitle: nullIfBlank(dto.original_title),
    poster: nullIfBlank(dto.poster),
    year: dto.year,
    ageRating: dto.age_rating,
    country: nullIfBlank(dto.country),
    duration: dto.duration,
    seasonCount: null,
    href: routes.movie(dto.id),
  };
}

export function mapSeriesSummary(
  dto: SeriesListDto,
  locale: string = DEFAULT_LOCALE,
): TitleSummary {
  const routes = localeRoutes(toLocale(locale));
  return {
    ...mapStats(dto),
    id: dto.id,
    kind: "series",
    title: nullIfBlank(dto.title) ?? nullIfBlank(dto.original_title) ?? UNTITLED,
    originalTitle: nullIfBlank(dto.original_title),
    poster: nullIfBlank(dto.poster),
    year: dto.year,
    ageRating: dto.age_rating,
    country: nullIfBlank(dto.country),
    duration: null,
    seasonCount: dto.season_count,
    href: routes.series(dto.id),
  };
}

function mapAudioTrack(dto: VoiceoverTrackDto, locale: string): AudioTrack {
  return {
    id: dto.id,
    language: dto.language,
    label:
      nullIfBlank(dto.label) ??
      nullIfBlank(dto.studio_name) ??
      languageName(dto.language, locale),
    studio: nullIfBlank(dto.studio_name),
    studioId: dto.studio,
  };
}

function mapSubtitleTrack(dto: SubtitleTrackDto, locale: string): SubtitleTrack {
  return {
    id: dto.id,
    language: dto.language,
    label: nullIfBlank(dto.label) ?? languageName(dto.language, locale),
    file: nullIfBlank(dto.file),
  };
}

export function mapMovieDetail(dto: MovieDetailDto, locale: string = DEFAULT_LOCALE): TitleDetail {
  const routes = localeRoutes(toLocale(locale));
  const title =
    translate(dto.translations, "title", locale) ??
    nullIfBlank(dto.original_title) ??
    "Без названия";

  return {
    ...mapStats(dto),
    id: dto.id,
    kind: "movie",
    title,
    originalTitle: nullIfBlank(dto.original_title),
    poster: nullIfBlank(dto.poster),
    backdrop: nullIfBlank(dto.backdrop),
    year: dto.year,
    ageRating: dto.age_rating,
    country: nullIfBlank(dto.country),
    duration: dto.duration,
    seasonCount: null,
    href: routes.movie(dto.id),
    description: translate(dto.translations, "description", locale),
    shortDescription: translate(dto.translations, "short_description", locale),
    trailerUrl: nullIfBlank(dto.trailer_url),
    audioTracks: dto.voiceover_tracks.map((track) => mapAudioTrack(track, locale)),
    subtitleTracks: dto.subtitle_tracks.map((track) => mapSubtitleTrack(track, locale)),
    seasons: [],
  };
}

function mapEpisode(dto: EpisodeTreeDto, seasonNumber: number, locale: string): Episode {
  return {
    id: dto.id,
    number: dto.number,
    seasonNumber,
    title: translate(dto.translations, "title", locale) ?? `Эпизод ${dto.number}`,
    description: translate(dto.translations, "description", locale),
    duration: dto.duration,
    thumbnail: nullIfBlank(dto.thumbnail),
    isPublished: dto.is_published,
    viewCount: dto.views_count,
  };
}

function mapSeason(dto: SeasonTreeDto, locale: string): Season {
  return {
    id: dto.id,
    number: dto.number,
    title: translate(dto.translations, "title", locale) ?? `Сезон ${dto.number}`,
    year: dto.year,
    episodes: [...dto.episodes]
      .sort((a, b) => a.number - b.number)
      .map((episode) => mapEpisode(episode, dto.number, locale)),
  };
}

export function mapSeriesDetail(
  dto: SeriesDetailDto,
  locale: string = DEFAULT_LOCALE,
): TitleDetail {
  const routes = localeRoutes(toLocale(locale));
  const title =
    translate(dto.translations, "title", locale) ??
    nullIfBlank(dto.original_title) ??
    "Без названия";

  const seasons = [...dto.seasons]
    .sort((a, b) => a.number - b.number)
    .map((season) => mapSeason(season, locale));

  return {
    ...mapStats(dto),
    id: dto.id,
    kind: "series",
    title,
    originalTitle: nullIfBlank(dto.original_title),
    poster: nullIfBlank(dto.poster),
    backdrop: nullIfBlank(dto.backdrop),
    year: dto.year,
    ageRating: dto.age_rating,
    country: nullIfBlank(dto.country),
    duration: null,
    seasonCount: seasons.length,
    href: routes.series(dto.id),
    description: translate(dto.translations, "description", locale),
    shortDescription: translate(dto.translations, "short_description", locale),
    trailerUrl: nullIfBlank(dto.trailer_url),
    // Series expose their tracks per episode, through the playback batch.
    audioTracks: [],
    subtitleTracks: [],
    seasons,
  };
}

export function mapPlayback(dto: PlaybackDto): PlaybackSource {
  return { manifestUrl: dto.manifest_url, videoId: nullIfBlank(dto.video_id) };
}

export function mapSeriesPlayback(
  dto: PlaybackBatchDto,
  locale: string = DEFAULT_LOCALE,
): SeriesPlayback {
  return {
    seriesId: dto.series,
    seasons: [...dto.seasons]
      .sort((a, b) => a.number - b.number)
      .map((season) => ({
        seasonId: season.id,
        number: season.number,
        episodes: [...season.episodes]
          .sort((a, b) => a.number - b.number)
          .map((episode) => ({
            episodeId: episode.id,
            number: episode.number,
            manifestUrl: nullIfBlank(episode.manifest_url),
            voiceovers: episode.voiceover_tracks.map((track) => ({
              id: track.id,
              language: track.language,
              label:
                nullIfBlank(track.label) ??
                nullIfBlank(track.studio_name) ??
                languageName(track.language, locale),
              manifestUrl: nullIfBlank(track.manifest_url),
            })),
          })),
      })),
  };
}

export function mapBranding(dto: OrganizationDto, locale: string = DEFAULT_LOCALE): Branding {
  return {
    name: nullIfBlank(dto.name) ?? "Evade Films",
    tagline: translate(dto.translations, "tagline", locale),
    logo: nullIfBlank(dto.logo),
    favicon: nullIfBlank(dto.favicon),
    siteUrl: nullIfBlank(dto.site_url),
    supportEmail: nullIfBlank(dto.support_email),
  };
}

/* --- Accounts ------------------------------------------------------------ */

export function mapViewer(dto: UserDto): Viewer {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.username,
    displayName: nullIfBlank(dto.display_name) ?? dto.username,
    firstName: dto.first_name,
    lastName: dto.last_name,
    avatar: nullIfBlank(dto.avatar),
    bio: nullIfBlank(dto.bio),
    birthDate: nullIfBlank(dto.birth_date),
    preferredLanguage: dto.preferred_language,
    isStaff: dto.is_staff,
    isCommentBanned: dto.is_comment_banned,
    joinedAt: dto.date_joined,
  };
}

export function mapPublicProfile(
  dto: PublicUserDto,
  locale: string = DEFAULT_LOCALE,
): PublicProfile {
  const routes = localeRoutes(toLocale(locale));
  return {
    id: dto.id,
    username: dto.username,
    displayName: nullIfBlank(dto.display_name) ?? dto.username,
    avatar: nullIfBlank(dto.avatar),
    href: routes.profile(dto.username),
  };
}

/* --- Interactions -------------------------------------------------------- */

/**
 * An episode has no page of its own: it is reached through its series, and
 * watched at the series player with `?season=&episode=`. Resolving that here is
 * what lets a history row and a catalogue tile be rendered by the same card.
 */
export function mapContentRef(
  dto: ContentRefDto,
  locale: string = DEFAULT_LOCALE,
): ContentRef {
  const routes = localeRoutes(toLocale(locale));
  const seriesId = dto.series_id;
  const fallbackTitle =
    dto.type === "episode" && dto.episode_number
      ? `Эпизод ${dto.episode_number}`
      : "Без названия";

  const href =
    dto.type === "movie"
      ? routes.movie(dto.id)
      : dto.type === "series"
        ? routes.series(dto.id)
        : seriesId
          ? routes.series(seriesId)
          : routes.home;

  const watchHref =
    dto.type === "movie"
      ? routes.watchMovie(dto.id)
      : dto.type === "series"
        ? routes.watchSeries(dto.id)
        : seriesId
          ? routes.watchSeries(seriesId, {
              season: dto.season_number ?? undefined,
              episode: dto.episode_number ?? undefined,
            })
          : routes.home;

  return {
    type: dto.type,
    id: dto.id,
    title: nullIfBlank(dto.title) ?? fallbackTitle,
    poster: nullIfBlank(dto.poster),
    year: dto.year,
    seriesId,
    seasonNumber: dto.season_number,
    episodeNumber: dto.episode_number,
    href,
    watchHref,
  };
}

/** The histogram arrives keyed by score as a string; the UI wants a dense array. */
export function mapRatingSummary(dto: RatingSummaryDto): RatingSummary {
  const distribution = Array.from({ length: 11 }, (_, score) => dto.distribution?.[score] ?? 0);

  return {
    average: dto.average,
    count: dto.count,
    distribution,
    myRating: dto.my_rating,
  };
}

export function mapUserRating(dto: RatingDto): UserRating {
  return {
    id: dto.id,
    value: dto.value,
    content: mapContentRef(dto.content),
    updatedAt: dto.updated_at,
  };
}

function mapReaction(value: number | null): Reaction {
  return value === 1 || value === -1 ? value : null;
}

export function mapComment(dto: CommentDto): Comment {
  return {
    id: dto.id,
    author: mapPublicProfile(dto.user),
    parentId: dto.parent,
    body: dto.body,
    isSpoiler: dto.is_spoiler,
    isDeleted: dto.is_deleted,
    isEdited: dto.is_edited,
    likes: dto.likes,
    dislikes: dto.dislikes,
    myReaction: mapReaction(dto.my_reaction),
    replyCount: dto.reply_count,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapCommentThread(dto: CommentThreadDto): CommentThread {
  return {
    ...mapComment(dto),
    replies: (dto.replies ?? []).map(mapComment),
  };
}

export function mapMyComment(dto: MyCommentDto): MyComment {
  return { ...mapComment(dto), content: mapContentRef(dto.content) };
}

export function mapWatchlistEntry(dto: WatchlistItemDto): WatchlistEntry {
  return {
    id: dto.id,
    content: mapContentRef(dto.content),
    status: dto.status,
    isFavorite: dto.is_favorite,
    note: nullIfBlank(dto.note),
    updatedAt: dto.updated_at,
  };
}

export function mapWatchEntry(dto: WatchHistoryDto): WatchEntry {
  return {
    id: dto.id,
    content: mapContentRef(dto.content),
    positionSeconds: dto.position_seconds,
    durationSeconds: dto.duration_seconds,
    progress: dto.progress,
    isFinished: dto.is_finished,
    watchedAt: dto.watched_at,
  };
}

export function mapViewCount(dto: ViewCountDto): ViewCount {
  return { total: dto.views_count, counted: dto.counted };
}
