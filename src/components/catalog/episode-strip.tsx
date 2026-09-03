import Link from "next/link";
import { Play } from "lucide-react";

import { SectionHeader } from "@/components/layout/section-header";
import { dictionary } from "@/lib/i18n/dictionary";
import { formatDuration } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Season } from "@/lib/domain/models";

export interface EpisodeStripProps {
  seriesId: number;
  season: Season;
  /** Episode currently in the player, marked rather than linked away. */
  activeNumber?: number;
}

/**
 * The episode list that sits under the player.
 *
 * Rows, not tiles: next to a 16:9 video another grid of stills would compete
 * with it. A hairline per row, a mono duration, and one silver marker for the
 * episode that is playing.
 */
export function EpisodeStrip({ seriesId, season, activeNumber }: EpisodeStripProps) {
  const episodes = season.episodes.filter((episode) => episode.isPublished);
  if (episodes.length === 0) return null;

  return (
    <section>
      <SectionHeader
        overline={dictionary.title.seasonN(season.number)}
        title={dictionary.title.episodes}
        note={dictionary.title.episodesCount(episodes.length)}
        className="mb-2"
      />

      <ul>
        {episodes.map((episode) => {
          const active = episode.number === activeNumber;

          return (
            <li key={episode.id}>
              <Link
                href={routes.watchSeries(seriesId, {
                  season: season.number,
                  episode: episode.number,
                })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group/row flex items-baseline gap-4 border-b border-[var(--border-hairline)] py-4",
                  "transition-colors duration-150 ease-evade",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "w-6 shrink-0 font-mono text-body-sm",
                    active ? "text-foreground" : "text-[var(--text-disabled)]",
                  )}
                >
                  {String(episode.number).padStart(2, "0")}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{episode.title}</span>
                  {episode.description ? (
                    <span className="mt-1 line-clamp-1 block text-body-sm text-muted-foreground">
                      {episode.description}
                    </span>
                  ) : null}
                </span>

                {episode.duration ? (
                  <span className="shrink-0 font-mono text-body-sm text-muted-foreground">
                    {formatDuration(episode.duration)}
                  </span>
                ) : null}

                <span
                  className={cn(
                    "shrink-0 transition-opacity duration-150 ease-evade",
                    active ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
                  )}
                >
                  <Play size={16} strokeWidth={1.5} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
