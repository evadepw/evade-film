/**
 * Every path the frontend touches, in one place. Relative to the API origin —
 * the axios instance supplies that.
 */

const V1 = "/api/v1";
const CATALOG = `${V1}/catalog`;

/**
 * Ratings, comments, views, watchlist and progress are the same five resources
 * hanging off three different content types, so their paths are generated
 * rather than written out fifteen times.
 *
 * The gaps are the backend's, not an omission here: a series has no resume
 * point of its own (its episodes do) and an episode is never shelved on its own
 * (its series is). `endpoints.interactions` only exposes what exists.
 */
export type ContentPathSegment = "movies" | "series" | "episodes";

const contentBase = (segment: ContentPathSegment, id: number | string) =>
  `${CATALOG}/${segment}/${id}`;

export const endpoints = {
  branding: `${V1}/branding/`,

  auth: {
    register: `${V1}/auth/register/`,
    login: `${V1}/auth/login/`,
    refresh: `${V1}/auth/refresh/`,
    logout: `${V1}/auth/logout/`,
    me: `${V1}/auth/me/`,
    changePassword: `${V1}/auth/change-password/`,
    publicProfile: (username: string) => `${V1}/auth/users/${encodeURIComponent(username)}/`,
  },

  movies: {
    list: `${CATALOG}/movies/`,
    detail: (id: number | string) => `${CATALOG}/movies/${id}/`,
    playback: (id: number | string) => `${CATALOG}/movies/${id}/playback/`,
    voiceoverTracks: (id: number | string) => `${CATALOG}/movies/${id}/voiceover-tracks/`,
    subtitleTracks: (id: number | string) => `${CATALOG}/movies/${id}/subtitle-tracks/`,
  },

  series: {
    list: `${CATALOG}/series/`,
    detail: (id: number | string) => `${CATALOG}/series/${id}/`,
    seasons: (id: number | string) => `${CATALOG}/series/${id}/seasons/`,
    playback: (id: number | string) => `${CATALOG}/series/${id}/playback/`,
    playbackBatch: (id: number | string) => `${CATALOG}/series/${id}/playback-batch/`,
  },

  seasons: {
    list: `${CATALOG}/seasons/`,
    detail: (id: number | string) => `${CATALOG}/seasons/${id}/`,
    episodes: (id: number | string) => `${CATALOG}/seasons/${id}/episodes/`,
  },

  episodes: {
    list: `${CATALOG}/episodes/`,
    detail: (id: number | string) => `${CATALOG}/episodes/${id}/`,
    voiceoverTracks: (id: number | string) => `${CATALOG}/episodes/${id}/voiceover-tracks/`,
    subtitleTracks: (id: number | string) => `${CATALOG}/episodes/${id}/subtitle-tracks/`,
  },

  voiceoverStudios: {
    list: `${CATALOG}/voiceover-studios/`,
    detail: (id: number | string) => `${CATALOG}/voiceover-studios/${id}/`,
  },

  interactions: {
    /** Movies, series and episodes. */
    rating: (segment: ContentPathSegment, id: number | string) =>
      `${contentBase(segment, id)}/rating/`,
    comments: (segment: ContentPathSegment, id: number | string) =>
      `${contentBase(segment, id)}/comments/`,
    view: (segment: ContentPathSegment, id: number | string) =>
      `${contentBase(segment, id)}/view/`,
    /** Movies and series only — an episode is shelved through its series. */
    watchlist: (segment: "movies" | "series", id: number | string) =>
      `${contentBase(segment, id)}/watchlist/`,
    /** Movies and episodes only — a series has no resume point of its own. */
    progress: (segment: "movies" | "episodes", id: number | string) =>
      `${contentBase(segment, id)}/progress/`,
  },

  comments: {
    detail: (id: number | string) => `${V1}/interactions/comments/${id}/`,
    react: (id: number | string) => `${V1}/interactions/comments/${id}/react/`,
  },

  me: {
    ratings: `${V1}/me/ratings/`,
    comments: `${V1}/me/comments/`,
    watchlist: `${V1}/me/watchlist/`,
    history: `${V1}/me/history/`,
    continueWatching: `${V1}/me/continue-watching/`,
  },
} as const;
