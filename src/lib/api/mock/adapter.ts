import { AxiosError, type AxiosAdapter, type AxiosRequestConfig, type AxiosResponse } from "axios";

import { API_PAGE_SIZE } from "@/lib/api/config";
import type {
  MovieListDto,
  PaginatedDto,
  PlaybackBatchDto,
  PlaybackDto,
  ProfileUpdateDto,
  RegisterRequestDto,
  SeriesListDto,
  WatchlistWriteDto,
} from "@/lib/api/types";

import { mockBranding, mockEpisodeVoiceovers, mockManifestUrl, mockMovies, mockSeries } from "./fixtures";
import * as store from "./state";

/**
 * An axios adapter that answers catalog requests from fixtures.
 *
 * It sits at the very bottom of the stack — below `http()`, below the services,
 * below the mappers — so mock mode exercises the exact same code path as the
 * real backend: same DTO shapes, same pagination envelope, same 404s. Filtering,
 * ordering and search are implemented rather than faked, because those are the
 * behaviours a frontend developer needs to work against.
 *
 * The catalogue answers from static fixtures; accounts, ratings, comments,
 * shelves and resume points answer from `./state`, which is mutable and lives
 * for the lifetime of the tab. Mock mode therefore exercises the half of the
 * app that writes, not only the half that reads — including the 401 that
 * triggers a token refresh and the 403 a comment ban produces.
 */

const LATENCY_MS = 120;

type Query = Record<string, string | undefined>;
type Method = "get" | "post" | "put" | "patch" | "delete";

/** Everything a handler may need beyond the path: the body and the bearer token. */
interface RequestContext {
  body: Record<string, unknown>;
  token: string | undefined;
}

interface Route {
  pattern: RegExp;
  /** Omitted means GET — most of the catalogue. */
  method?: Method;
  /** Success status, when it is not 200. */
  status?: number;
  handle: (params: string[], query: Query, ctx: RequestContext) => unknown;
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

class NotFound extends Error {}

/**
 * One anonymous visitor per tab, so the view counter can deduplicate the way
 * the real one does instead of climbing on every reload.
 */
const VISITOR = `mock-visitor-${Math.random().toString(36).slice(2)}`;

function paginate<T>(items: T[], query: Query): PaginatedDto<T> {
  const page = Math.max(1, Number(query.page) || 1);
  const start = (page - 1) * API_PAGE_SIZE;
  const slice = items.slice(start, start + API_PAGE_SIZE);

  return {
    count: items.length,
    next: start + API_PAGE_SIZE < items.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: slice,
  };
}

function matchesSearch(haystack: string[], term: string | undefined): boolean {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  return haystack.some((value) => value.toLowerCase().includes(needle));
}

/** The subset of DRF's filter/ordering surface the catalogue actually uses. */
function filterTitles<T extends MovieListDto | SeriesListDto>(items: T[], query: Query): T[] {
  let result = items.filter((item) => {
    if (query.age_rating && item.age_rating !== query.age_rating) return false;
    if (query.country && item.country !== query.country) return false;
    if (query.year && item.year !== Number(query.year)) return false;
    if (query.year_min && (item.year ?? 0) < Number(query.year_min)) return false;
    if (query.year_max && (item.year ?? 0) > Number(query.year_max)) return false;
    return matchesSearch([item.title, item.original_title], query.search);
  });

  const ordering = query.ordering ?? "-created_at";
  const descending = ordering.startsWith("-");
  const field = descending ? ordering.slice(1) : ordering;

  result = [...result].sort((a, b) => {
    const compare =
      field === "title"
        ? a.title.localeCompare(b.title, "ru")
        : field === "year"
          ? (a.year ?? 0) - (b.year ?? 0)
          : Date.parse(a.created_at) - Date.parse(b.created_at);
    return descending ? -compare : compare;
  });

  return result;
}

/**
 * Overlays the live counters onto a static fixture. The real serialisers
 * annotate these on every catalog read, so the mock does too — otherwise a
 * rating given in mock mode would show in the rating block and nowhere else.
 */
function withStats<T extends object>(type: store.MockContentType, id: number, dto: T): T {
  return { ...dto, ...store.statsFor(type, id) };
}

/**
 * The episode tree inside a series detail carries the view counter and nothing
 * else — the schema gives it no rating aggregates, and handing out more than
 * the real API does is how a mock quietly hides a missing field.
 */
function withViews<T extends object>(id: number, dto: T): T {
  return { ...dto, views_count: store.statsFor("episode", id).views_count };
}

function findMovie(id: string) {
  const found = mockMovies.find((entry) => String(entry.list.id) === id);
  if (!found) throw new NotFound();
  return found;
}

function findSeries(id: string) {
  const found = mockSeries.find((entry) => entry.list.id === Number(id));
  if (!found) throw new NotFound();
  return found;
}

function seriesPlayback(id: string): PlaybackBatchDto {
  const { detail } = findSeries(id);

  return {
    series: detail.id,
    seasons: detail.seasons.map((season) => ({
      id: season.id,
      number: season.number,
      // Drafts have no video yet, exactly as the real batch endpoint reports.
      episodes: season.episodes
        .filter((ep) => ep.is_published)
        .map((ep) => {
          const videoId = `mock-${detail.id}-${season.number}-${ep.number}`;
          return {
            id: ep.id,
            number: ep.number,
            video_id: videoId,
            manifest_url: mockManifestUrl(videoId),
            player_videos: [{ id: ep.id, video_id: videoId, manifest_url: mockManifestUrl(videoId) }],
            voiceover_tracks: mockEpisodeVoiceovers.map((track) => ({
              ...track,
              video_id: videoId,
              manifest_url: mockManifestUrl(`${videoId}-${track.id}`),
            })),
          };
        }),
    })),
  };
}

const V1 = "/api/v1";
const CATALOG = `${V1}/catalog`;

/**
 * Rating, comments, view, watchlist and progress are the same five resources on
 * three content types. Building them from one generator keeps the mock honest
 * about which combinations exist: watchlist is skipped for episodes and
 * progress for series, because those routes do not exist in the schema either.
 */
function interactionRoutes(segment: string, type: store.MockContentType): Route[] {
  const base = `^${CATALOG}/${segment}/(\\d+)`;

  const routes: Route[] = [
    {
      pattern: new RegExp(`${base}/rating/$`),
      handle: ([id], _query, ctx) =>
        store.ratingSummary(type, Number(id), store.userForToken(ctx.token)),
    },
    {
      pattern: new RegExp(`${base}/rating/$`),
      method: "put",
      handle: ([id], _query, ctx) =>
        store.setRating(type, Number(id), store.requireUser(ctx.token), Number(ctx.body.value)),
    },
    {
      pattern: new RegExp(`${base}/rating/$`),
      method: "delete",
      handle: ([id], _query, ctx) =>
        store.clearRating(type, Number(id), store.requireUser(ctx.token)),
    },
    {
      pattern: new RegExp(`${base}/view/$`),
      method: "post",
      handle: ([id]) => store.countView(type, Number(id), VISITOR),
    },
    {
      pattern: new RegExp(`${base}/comments/$`),
      handle: ([id], query, ctx) =>
        paginate(
          store.listComments(type, Number(id), store.userForToken(ctx.token), query.ordering),
          query,
        ),
    },
    {
      pattern: new RegExp(`${base}/comments/$`),
      method: "post",
      status: 201,
      handle: ([id], _query, ctx) =>
        store.addComment(type, Number(id), store.requireUser(ctx.token), {
          body: String(ctx.body.body ?? ""),
          is_spoiler: Boolean(ctx.body.is_spoiler),
          parent: typeof ctx.body.parent === "number" ? ctx.body.parent : null,
        }),
    },
  ];

  if (type !== "episode") {
    routes.push(
      {
        pattern: new RegExp(`${base}/watchlist/$`),
        handle: ([id], _query, ctx) => {
          const entry = store.getWatchlistEntry(type, Number(id), store.requireUser(ctx.token));
          if (!entry) throw new NotFound();
          return entry;
        },
      },
      {
        pattern: new RegExp(`${base}/watchlist/$`),
        method: "put",
        handle: ([id], _query, ctx) =>
          store.saveWatchlistEntry(
          type,
          Number(id),
          store.requireUser(ctx.token),
          ctx.body as WatchlistWriteDto,
        ),
      },
      {
        pattern: new RegExp(`${base}/watchlist/$`),
        method: "delete",
        status: 204,
        handle: ([id], _query, ctx) => {
          store.removeWatchlistEntry(type, Number(id), store.requireUser(ctx.token));
          return null;
        },
      },
    );
  }

  if (type !== "series") {
    routes.push(
      {
        pattern: new RegExp(`${base}/progress/$`),
        handle: ([id], _query, ctx) => {
          const entry = store.getProgress(type, Number(id), store.requireUser(ctx.token));
          if (!entry) throw new NotFound();
          return entry;
        },
      },
      {
        pattern: new RegExp(`${base}/progress/$`),
        method: "put",
        handle: ([id], _query, ctx) =>
          store.saveProgress(type, Number(id), store.requireUser(ctx.token), {
            position_seconds: Number(ctx.body.position_seconds ?? 0),
            duration_seconds:
              typeof ctx.body.duration_seconds === "number" ? ctx.body.duration_seconds : null,
            is_finished:
              typeof ctx.body.is_finished === "boolean" ? ctx.body.is_finished : undefined,
          }),
      },
      {
        pattern: new RegExp(`${base}/progress/$`),
        method: "delete",
        status: 204,
        handle: ([id], _query, ctx) => {
          store.clearProgress(type, Number(id), store.requireUser(ctx.token));
          return null;
        },
      },
    );
  }

  return routes;
}

const routes: Route[] = [
  { pattern: new RegExp(`^${V1}/branding/$`), handle: () => mockBranding },

  {
    pattern: new RegExp(`^${CATALOG}/movies/$`),
    handle: (_params, query) =>
      paginate(
        filterTitles(
          mockMovies.map((entry) => withStats("movie", entry.list.id, entry.list)),
          query,
        ),
        query,
      ),
  },
  {
    pattern: new RegExp(`^${CATALOG}/movies/(\\d+)/$`),
    handle: ([id]) => withStats("movie", Number(id), findMovie(id).detail),
  },
  {
    pattern: new RegExp(`^${CATALOG}/movies/(\\d+)/playback/$`),
    handle: ([id]): PlaybackDto => {
      const { detail } = findMovie(id);
      const videoId = detail.video_id ?? `mock-movie-${id}`;
      return { manifest_url: mockManifestUrl(videoId), video_id: videoId };
    },
  },
  {
    pattern: new RegExp(`^${CATALOG}/movies/(\\d+)/voiceover-tracks/$`),
    handle: ([id], query) => paginate(findMovie(id).detail.voiceover_tracks, query),
  },
  {
    pattern: new RegExp(`^${CATALOG}/movies/(\\d+)/subtitle-tracks/$`),
    handle: ([id], query) => paginate(findMovie(id).detail.subtitle_tracks, query),
  },

  {
    pattern: new RegExp(`^${CATALOG}/series/$`),
    handle: (_params, query) =>
      paginate(
        filterTitles(
          mockSeries.map((entry) => withStats("series", entry.list.id, entry.list)),
          query,
        ),
        query,
      ),
  },
  {
    pattern: new RegExp(`^${CATALOG}/series/(\\d+)/$`),
    handle: ([id]) => {
      const { detail } = findSeries(id);
      return {
        ...withStats("series", Number(id), detail),
        seasons: detail.seasons.map((season) => ({
          ...season,
          episodes: season.episodes.map((episode) => withViews(episode.id, episode)),
        })),
      };
    },
  },
  {
    pattern: new RegExp(`^${CATALOG}/series/(\\d+)/playback-batch/$`),
    handle: ([id]) => seriesPlayback(id),
  },
  {
    pattern: new RegExp(`^${CATALOG}/series/(\\d+)/playback/$`),
    handle: ([id], query): PlaybackDto => {
      const videoId = `mock-${id}-${query.season ?? 1}-${query.episode ?? 1}`;
      return { manifest_url: mockManifestUrl(videoId), video_id: videoId };
    },
  },
  {
    pattern: new RegExp(`^${CATALOG}/series/(\\d+)/seasons/$`),
    handle: ([id], query) =>
      paginate(
        findSeries(id).detail.seasons.map((season) => ({
          id: season.id,
          number: season.number,
          translations: season.translations,
          year: season.year,
          episode_count: season.episodes.length,
        })),
        query,
      ),
  },
  {
    pattern: new RegExp(`^${CATALOG}/seasons/(\\d+)/episodes/$`),
    handle: ([id], query) => {
      const season = mockSeries
        .flatMap((entry) => entry.detail.seasons)
        .find((candidate) => candidate.id === Number(id));
      if (!season) throw new NotFound();

      return paginate(
        season.episodes.map((ep) =>
          withStats("episode", ep.id, {
            id: ep.id,
            number: ep.number,
            title: ep.translations.ru?.title ?? `Эпизод ${ep.number}`,
            duration: ep.duration,
            thumbnail: ep.thumbnail,
            is_published: ep.is_published,
          }),
        ),
        query,
      );
    },
  },

  /* --- Auth -------------------------------------------------------------- */

  {
    pattern: new RegExp(`^${V1}/auth/register/$`),
    method: "post",
    status: 201,
    handle: (_params, _query, ctx) => {
      // The mock trusts the shape the service sends; the real API validates it.
      const user = store.createAccount(ctx.body as unknown as RegisterRequestDto);
      return { ...store.tokensFor(user), user };
    },
  },
  {
    pattern: new RegExp(`^${V1}/auth/login/$`),
    method: "post",
    handle: (_params, _query, ctx) => {
      const user = store.authenticate(String(ctx.body.email ?? ""), String(ctx.body.password ?? ""));
      return { ...store.tokensFor(user), user };
    },
  },
  {
    pattern: new RegExp(`^${V1}/auth/refresh/$`),
    method: "post",
    handle: (_params, _query, ctx) => {
      const refresh = String(ctx.body.refresh ?? "");
      const user = store.userForToken(refresh);
      if (!user) throw new store.MockUnauthorized();
      // Rotation on, like the real deployment: the old refresh stops working.
      store.revokeToken(refresh);
      return store.tokensFor(user);
    },
  },
  {
    pattern: new RegExp(`^${V1}/auth/logout/$`),
    method: "post",
    status: 205,
    handle: (_params, _query, ctx) => {
      store.revokeToken(String(ctx.body.refresh ?? ""));
      return null;
    },
  },
  {
    pattern: new RegExp(`^${V1}/auth/me/$`),
    handle: (_params, _query, ctx) => store.requireUser(ctx.token),
  },
  {
    pattern: new RegExp(`^${V1}/auth/me/$`),
    method: "patch",
    handle: (_params, _query, ctx) =>
      store.updateAccount(store.requireUser(ctx.token), ctx.body as ProfileUpdateDto),
  },
  {
    pattern: new RegExp(`^${V1}/auth/change-password/$`),
    method: "post",
    handle: (_params, _query, ctx) => {
      const user = store.requireUser(ctx.token);
      store.setPassword(user, String(ctx.body.old_password ?? ""), String(ctx.body.new_password ?? ""));
      return { ...store.tokensFor(user), user };
    },
  },
  {
    pattern: new RegExp(`^${V1}/auth/users/([^/]+)/$`),
    handle: ([username]) => {
      const user = store.findByUsername(decodeURIComponent(username));
      if (!user) throw new NotFound();
      return store.publicUser(user);
    },
  },

  /* --- Interactions ------------------------------------------------------ */

  ...interactionRoutes("movies", "movie"),
  ...interactionRoutes("series", "series"),
  ...interactionRoutes("episodes", "episode"),

  /* --- Comments ---------------------------------------------------------- */

  {
    pattern: new RegExp(`^${V1}/interactions/comments/(\\d+)/$`),
    handle: ([id], _query, ctx) =>
      store.getComment(Number(id), store.userForToken(ctx.token)),
  },
  {
    pattern: new RegExp(`^${V1}/interactions/comments/(\\d+)/$`),
    method: "patch",
    handle: ([id], _query, ctx) =>
      store.editComment(Number(id), store.requireUser(ctx.token), ctx.body),
  },
  {
    pattern: new RegExp(`^${V1}/interactions/comments/(\\d+)/$`),
    method: "delete",
    status: 204,
    handle: ([id], _query, ctx) => {
      store.deleteComment(Number(id), store.requireUser(ctx.token));
      return null;
    },
  },
  {
    pattern: new RegExp(`^${V1}/interactions/comments/(\\d+)/react/$`),
    method: "post",
    handle: ([id], _query, ctx) =>
      store.reactToComment(Number(id), store.requireUser(ctx.token), ctx.body.value === -1 ? -1 : 1),
  },

  /* --- Me ---------------------------------------------------------------- */

  {
    pattern: new RegExp(`^${V1}/me/ratings/$`),
    handle: (_params, query, ctx) => paginate(store.listRatings(store.requireUser(ctx.token)), query),
  },
  {
    pattern: new RegExp(`^${V1}/me/comments/$`),
    handle: (_params, query, ctx) =>
      paginate(store.listMyComments(store.requireUser(ctx.token)), query),
  },
  {
    pattern: new RegExp(`^${V1}/me/watchlist/$`),
    handle: (_params, query, ctx) =>
      paginate(
        store.listWatchlist(store.requireUser(ctx.token), {
          status: query.status,
          favorite: query.favorite,
        }),
        query,
      ),
  },
  {
    pattern: new RegExp(`^${V1}/me/history/$`),
    handle: (_params, query, ctx) =>
      paginate(store.listHistory(store.requireUser(ctx.token), query.finished), query),
  },
  {
    pattern: new RegExp(`^${V1}/me/continue-watching/$`),
    handle: (_params, query, ctx) =>
      paginate(store.listContinueWatching(store.requireUser(ctx.token)), query),
  },
];


function respond(config: AxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return {
    data,
    status,
    statusText: status < 400 ? "OK" : "Error",
    headers: {},
    config: config as AxiosResponse["config"],
  };
}

function fail(
  config: AxiosRequestConfig,
  status: number,
  data: unknown,
  message: string,
): AxiosError {
  return new AxiosError(
    message,
    "ERR_BAD_REQUEST",
    config as AxiosResponse["config"],
    undefined,
    respond(config, status, data),
  );
}

function parseBody(data: unknown): Record<string, unknown> {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (data as Record<string, unknown>) ?? {};
}

function bearer(config: AxiosRequestConfig): string | undefined {
  const raw = config.headers?.Authorization ?? config.headers?.authorization;
  return typeof raw === "string" && raw.startsWith("Bearer ") ? raw.slice(7) : undefined;
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await delay();

  const url = new URL(config.url ?? "/", config.baseURL ?? "http://mock.local");
  const method = (config.method ?? "get").toLowerCase() as Method;
  const query: Query = Object.fromEntries(
    Object.entries((config.params ?? {}) as Record<string, unknown>).map(([key, value]) => [
      key,
      value === undefined || value === null ? undefined : String(value),
    ]),
  );

  const ctx: RequestContext = { body: parseBody(config.data), token: bearer(config) };

  for (const route of routes) {
    if ((route.method ?? "get") !== method) continue;
    const match = route.pattern.exec(url.pathname);
    if (!match) continue;

    try {
      return respond(config, route.status ?? 200, route.handle(match.slice(1), query, ctx));
    } catch (error) {
      if (error instanceof NotFound) break;
      // The error classes below are how the mock reproduces the failures the
      // UI has to handle: an expired token, a comment ban, a rejected form.
      if (error instanceof store.MockUnauthorized) {
        throw fail(config, 401, { detail: "Учётные данные не предоставлены." }, "Unauthorized");
      }
      if (error instanceof store.MockForbidden) {
        throw fail(config, 403, { detail: "Действие недоступно." }, "Forbidden");
      }
      if (error instanceof store.MockValidation) {
        throw fail(config, 400, error.fields, "Validation error");
      }
      throw error;
    }
  }

  throw fail(
    config,
    404,
    { detail: "Not found." },
    `Mock API has no ${method.toUpperCase()} fixture for ${url.pathname}`,
  );
};
