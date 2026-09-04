import type { AgeRating } from "@/lib/api/types";

/**
 * The shapes the UI renders.
 *
 * Movies and series share one summary type on purpose: rails, grids and cards
 * are written once and work for both. `kind` is the discriminator and `href`
 * is resolved by the mapper, so no component has to know the route table.
 */

export type TitleKind = "movie" | "series";

/**
 * Counters the catalog denormalises onto every title. They are why a card can
 * show a score without asking `/rating/` per tile, and why the rating block on
 * a title page has an average to draw before its own request lands.
 */
export interface ContentStats {
  /** Mean user score 0–10, or null when nobody has rated it. */
  rating: number | null;
  ratingCount: number;
  commentCount: number;
  /** Deduplicated views, anonymous visitors included. */
  viewCount: number;
}

export interface TitleSummary extends ContentStats {
  id: number;
  kind: TitleKind;
  title: string;
  originalTitle: string | null;
  poster: string | null;
  year: number | null;
  ageRating: AgeRating | null;
  country: string | null;
  /** Minutes. Movies only. */
  duration: number | null;
  /** Series only. */
  seasonCount: number | null;
  href: string;
}

export interface AudioTrack {
  id: number;
  language: string;
  /** Ready-to-render label: studio, explicit label or language name. */
  label: string;
  /**
   * The dubbing studio, kept apart from `label` as well as inside it. The label
   * is a sentence («Русский (LostFilm)»); these two are the thing itself, which
   * is what a filter or a studio page would need.
   */
  studio: string | null;
  studioId: number | null;
}

export interface SubtitleTrack {
  id: number;
  language: string;
  label: string;
  file: string | null;
}

export interface Episode {
  id: number;
  number: number;
  seasonNumber: number;
  title: string;
  description: string | null;
  /** Minutes. */
  duration: number | null;
  thumbnail: string | null;
  isPublished: boolean;
  /** The tree carries only this counter, not the rating aggregates. */
  viewCount: number;
}

export interface Season {
  id: number;
  number: number;
  title: string;
  year: number | null;
  episodes: Episode[];
}

export interface TitleDetail extends TitleSummary {
  description: string | null;
  shortDescription: string | null;
  backdrop: string | null;
  trailerUrl: string | null;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  /** Series only; empty for movies. */
  seasons: Season[];
}

export interface Page<T> {
  items: T[];
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/* --- Playback ------------------------------------------------------------ */

export interface PlaybackSource {
  /** Signed, short-lived HLS master manifest. Opaque — never cache it. */
  manifestUrl: string;
  videoId: string | null;
}

export interface EpisodePlayback {
  episodeId: number;
  number: number;
  manifestUrl: string | null;
  voiceovers: Array<{
    id: number;
    label: string;
    language: string;
    manifestUrl: string | null;
  }>;
}

export interface SeasonPlayback {
  seasonId: number;
  number: number;
  episodes: EpisodePlayback[];
}

export interface SeriesPlayback {
  seriesId: number;
  seasons: SeasonPlayback[];
}

export interface Branding {
  name: string;
  tagline: string | null;
  logo: string | null;
  favicon: string | null;
  siteUrl: string | null;
  supportEmail: string | null;
}

/* --- Accounts ------------------------------------------------------------ */

/** The signed-in account, as the UI needs it. */
export interface Viewer {
  id: number;
  email: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  birthDate: string | null;
  preferredLanguage: "ru" | "en";
  isStaff: boolean;
  /** Reading, rating and watching still work — only posting is blocked. */
  isCommentBanned: boolean;
  joinedAt: string;
}

/** Anyone else: a comment author, a profile page. Never carries an email. */
export interface PublicProfile {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  href: string;
}

/* --- Interactions -------------------------------------------------------- */

export type ContentType = "movie" | "series" | "episode";

/**
 * What a rating, a comment or a history row points back at — enough to render a
 * card without a second request. `href` and `watchHref` are resolved here so no
 * component has to know that an episode is watched through its series.
 */
export interface ContentRef {
  type: ContentType;
  id: number;
  title: string;
  poster: string | null;
  year: number | null;
  seriesId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  /** The detail page. */
  href: string;
  /** The player. */
  watchHref: string;
}

export interface RatingSummary {
  /** Mean score 0–10, or null when nobody has voted. */
  average: number | null;
  count: number;
  /** Votes per score, index 0–10. */
  distribution: number[];
  /** The viewer's own score, or null when unrated or anonymous. */
  myRating: number | null;
}

export interface UserRating {
  id: number;
  value: number;
  content: ContentRef;
  updatedAt: string;
}

export type Reaction = 1 | -1 | null;

export interface Comment {
  id: number;
  author: PublicProfile;
  parentId: number | null;
  /** Empty for a tombstone — the row survives so its replies do. */
  body: string;
  isSpoiler: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  likes: number;
  dislikes: number;
  myReaction: Reaction;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A top-level comment with its replies. Threads are one level deep. */
export interface CommentThread extends Comment {
  replies: Comment[];
}

/** One of the viewer's own comments, with the title it was left on. */
export interface MyComment extends Comment {
  content: ContentRef;
}

export type WatchlistStatus = "planned" | "watching" | "completed" | "dropped";

export interface WatchlistEntry {
  id: number;
  content: ContentRef;
  status: WatchlistStatus;
  isFavorite: boolean;
  note: string | null;
  updatedAt: string;
}

export interface WatchEntry {
  id: number;
  content: ContentRef;
  positionSeconds: number;
  durationSeconds: number | null;
  /** 0–100, derived by the backend. */
  progress: number;
  isFinished: boolean;
  watchedAt: string;
}

export interface ViewCount {
  total: number;
  /** False when this visitor was already counted today. */
  counted: boolean;
}
