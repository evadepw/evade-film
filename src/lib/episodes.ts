import { routes } from "@/lib/routes";
import type { Episode, Season, TitleDetail } from "@/lib/domain/models";

/**
 * An episode together with the season it sits in and its neighbours.
 *
 * The season tree is the only place an episode's position is known — the
 * episode itself carries a number but not what comes before or after it across
 * a season boundary.
 */
export interface FoundEpisode {
  episode: Episode;
  season: Season;
  previous: Episode | null;
  next: Episode | null;
  /** Its own page. */
  href: string;
  /** Straight into the player at this episode. */
  watchHref: string;
}

/** Every published episode of a series, in running order across all seasons. */
export function orderedEpisodes(series: TitleDetail): Array<{ season: Season; episode: Episode }> {
  return [...series.seasons]
    .sort((a, b) => a.number - b.number)
    .flatMap((season) =>
      [...season.episodes]
        .sort((a, b) => a.number - b.number)
        .map((episode) => ({ season, episode })),
    );
}

/** Locates one episode of a series by id. Null when it belongs to another series. */
export function findEpisode(series: TitleDetail, episodeId: number): FoundEpisode | null {
  if (!Number.isFinite(episodeId)) return null;

  const running = orderedEpisodes(series);
  const index = running.findIndex((entry) => entry.episode.id === episodeId);
  if (index === -1) return null;

  const { season, episode } = running[index];

  return {
    episode,
    season,
    previous: running[index - 1]?.episode ?? null,
    next: running[index + 1]?.episode ?? null,
    href: routes.episode(series.id, episode.id),
    watchHref: routes.watchSeries(series.id, {
      season: season.number,
      episode: episode.number,
    }),
  };
}
