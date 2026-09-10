import type { MetadataRoute } from "next";

import { catalogService } from "@/lib/api/services/catalog.service";
import { collectionsService } from "@/lib/api/services/collections.service";
import { orderedEpisodes } from "@/lib/episodes";
import { LOCALES } from "@/lib/i18n/locale";
import { localeRoutes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import type { Page, TitleSummary } from "@/lib/domain/models";

export const revalidate = 3600;

/**
 * A ceiling on how far the walk below will go. The catalogue paginates and the
 * API is the slow part, so an unbounded loop over a large install would turn
 * one crawler request into hundreds of backend ones. Titles past this point are
 * still reachable — through the listings, which is how a crawler finds them.
 */
const MAX_PAGES = 50;

/** Series whose episode lists are walked. One detail request each. */
const MAX_EPISODE_SERIES = 100;

/** Walks a paginated listing to the end, or to `MAX_PAGES`, whichever comes first. */
async function collect(
  list: (page: number) => Promise<Page<TitleSummary>>,
): Promise<TitleSummary[]> {
  const items: TitleSummary[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await list(page);
    items.push(...result.items);
    if (!result.hasNext) break;
  }

  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getSiteUrl();
  // Every entry has to be absolute, and a sitemap under the wrong origin is
  // worse than none: without a configured origin, serve nothing.
  if (!site) return [];

  const at = (path: string) => new URL(path, site).toString();

  /**
   * One entry per language, each pointing at the others through `alternates`.
   * A sitemap that lists only one of a pair leaves the other to be discovered
   * by luck.
   */
  const entry = (
    path: (routes: ReturnType<typeof localeRoutes>) => string,
    rest: { changeFrequency: "daily" | "weekly" | "monthly"; priority: number },
  ) =>
    LOCALES.map((locale) => ({
      url: at(path(localeRoutes(locale))),
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((other) => [other, at(path(localeRoutes(other)))]),
        ),
      },
      ...rest,
    }));

  const statics: MetadataRoute.Sitemap = [
    ...entry((r) => r.home, { changeFrequency: "daily", priority: 1 }),
    ...entry((r) => r.movies, { changeFrequency: "daily", priority: 0.8 }),
    ...entry((r) => r.seriesList, { changeFrequency: "daily", priority: 0.8 }),
    ...entry((r) => r.collections, { changeFrequency: "weekly", priority: 0.6 }),
    ...entry((r) => r.search(), { changeFrequency: "monthly", priority: 0.3 }),
  ];

  // A listing that fails costs its own titles, not the whole sitemap.
  const [movies, series, collections] = await Promise.all([
    collect((page) => catalogService.listMovies({ page, ordering: "-created_at" })).catch(() => []),
    collect((page) => catalogService.listSeries({ page, ordering: "-created_at" })).catch(() => []),
    // Shelves are few and hand-authored, so the first page is all of them in
    // practice — and `expand` is deliberately omitted: a sitemap needs the
    // addresses, not the contents.
    collectionsService
      .listCollections()
      .then((page) => page.items)
      .catch(() => []),
  ]);

  /**
   * Episodes are pages of their own, and for a series they are most of the
   * indexable surface — one series is one URL, its episodes are dozens. The
   * season tree only comes with the detail response, so each series costs a
   * request; `MAX_EPISODE_SERIES` keeps that from growing without bound.
   */
  const episodeUrls = await Promise.all(
    series.slice(0, MAX_EPISODE_SERIES).map(async (title) => {
      const detail = await catalogService.getSeries(title.id).catch(() => null);
      if (!detail) return [];
      return orderedEpisodes(detail).flatMap(({ episode }) =>
        entry((r) => r.episode(title.id, episode.id), {
          changeFrequency: "monthly",
          priority: 0.5,
        }),
      );
    }),
  );

  return [
    ...statics,
    ...collections.flatMap((collection) =>
      entry((r) => r.collection(collection.slug), {
        changeFrequency: "weekly",
        priority: 0.5,
      }),
    ),
    ...[...movies, ...series].flatMap((title) =>
      entry(
        (r) => (title.kind === "movie" ? r.movie(title.id) : r.series(title.id)),
        { changeFrequency: "weekly", priority: 0.6 },
      ),
    ),
    ...episodeUrls.flat(),
  ];
}
