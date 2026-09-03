/** The route table. Nothing else builds a URL by hand. */
export const routes = {
  home: "/",
  movies: "/movies",
  movie: (id: number | string) => `/movies/${id}`,
  watchMovie: (id: number | string) => `/movies/${id}/watch`,
  series: (id: number | string) => `/series/${id}`,
  seriesList: "/series",
  watchSeries: (
    id: number | string,
    params?: { season?: number; episode?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.season) query.set("season", String(params.season));
    if (params?.episode) query.set("episode", String(params.episode));
    const suffix = query.size ? `?${query}` : "";
    return `/series/${id}/watch${suffix}`;
  },
  search: (query?: string) => (query ? `/search?q=${encodeURIComponent(query)}` : "/search"),

  /** Someone else's public card. */
  profile: (username: string) => `/users/${encodeURIComponent(username)}`,

  /** The viewer's own pages — one per `/api/v1/me/` collection. */
  account: {
    root: "/account",
    watchlist: "/account/watchlist",
    ratings: "/account/ratings",
    comments: "/account/comments",
    history: "/account/history",
  },
} as const;
