import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/locale";

/**
 * The route table. Nothing else builds a URL by hand.
 *
 * Every path is prefixed with the viewer's language, because the language is
 * part of the address rather than a preference hidden in a cookie: an English
 * page has its own URL, so it can be linked, shared and indexed.
 *
 * The prefix is applied by `localeRoutes(locale)`. The bare `routes` object is
 * the default language, kept for the places that genuinely have no locale at
 * hand — `robots.ts` and the sitemap build their own absolute URLs anyway.
 */
function build(locale: AppLocale) {
  const at = (path: string) => `/${locale}${path}`;

  return {
    home: at(""),
    movies: at("/movies"),
    movie: (id: number | string) => at(`/movies/${id}`),
    watchMovie: (id: number | string) => at(`/movies/${id}/watch`),
    series: (id: number | string) => at(`/series/${id}`),
    /** One episode's own page — a title, a still, its rating and its thread. */
    episode: (seriesId: number | string, episodeId: number | string) =>
      at(`/series/${seriesId}/episodes/${episodeId}`),
    seriesList: at("/series"),
    watchSeries: (id: number | string, params?: { season?: number; episode?: number }) => {
      const query = new URLSearchParams();
      if (params?.season) query.set("season", String(params.season));
      if (params?.episode) query.set("episode", String(params.episode));
      const suffix = query.size ? `?${query}` : "";
      return at(`/series/${id}/watch${suffix}`);
    },
    /** Editorial shelves. Routed on the slug — stable, readable, shareable. */
    collections: at("/collections"),
    collection: (slug: string) => at(`/collections/${encodeURIComponent(slug)}`),

    search: (query?: string) =>
      query ? at(`/search?q=${encodeURIComponent(query)}`) : at("/search"),

    /** Someone else's public card. */
    profile: (username: string) => at(`/users/${encodeURIComponent(username)}`),

    /** The viewer's own pages — one per `/api/v1/me/` collection. */
    account: {
      root: at("/account"),
      watchlist: at("/account/watchlist"),
      ratings: at("/account/ratings"),
      comments: at("/account/comments"),
      history: at("/account/history"),
    },
  } as const;
}

export type Routes = ReturnType<typeof build>;

const CACHE = new Map<AppLocale, Routes>();

/** The route table for one language. Memoised — the object is referenced a lot. */
export function localeRoutes(locale: AppLocale = DEFAULT_LOCALE): Routes {
  let table = CACHE.get(locale);
  if (!table) {
    table = build(locale);
    CACHE.set(locale, table);
  }
  return table;
}

export const routes = localeRoutes(DEFAULT_LOCALE);
