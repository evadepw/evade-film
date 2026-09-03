"use client";

import Link from "next/link";
import { Play } from "lucide-react";

import { Poster } from "@/components/media/poster";
import { StateBlock } from "@/components/feedback/state-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dictionary } from "@/lib/i18n/dictionary";
import { formatDuration } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Season } from "@/lib/domain/models";

export interface EpisodeListProps {
  seriesId: number;
  seasons: Season[];
}

/** Season tabs over a vertical list of episodes — a still, a title, a duration. */
export function EpisodeList({ seriesId, seasons }: EpisodeListProps) {
  const withEpisodes = seasons.filter((season) => season.episodes.length > 0);

  if (withEpisodes.length === 0) {
    return (
      <StateBlock
        title={dictionary.empty.episodes}
        hint={dictionary.empty.episodesHint}
        className="py-14"
      />
    );
  }

  return (
    <Tabs defaultValue={String(withEpisodes[0].number)} className="gap-8">
      {withEpisodes.length > 1 ? (
        <TabsList>
          {withEpisodes.map((season) => (
            <TabsTrigger key={season.id} value={String(season.number)}>
              {dictionary.title.seasonN(season.number)}
            </TabsTrigger>
          ))}
        </TabsList>
      ) : null}

      {withEpisodes.map((season) => (
        <TabsContent key={season.id} value={String(season.number)} className="flex flex-col gap-5">
          {season.episodes.map((episode) => (
            <Link
              key={episode.id}
              href={routes.watchSeries(seriesId, {
                season: season.number,
                episode: episode.number,
              })}
              className="group/episode flex gap-5 rounded-lg"
            >
              <div className="relative w-[160px] shrink-0 md:w-[200px]">
                <Poster
                  src={episode.thumbnail}
                  alt={episode.title}
                  ratio="still"
                  sizes="200px"
                  label={String(episode.number)}
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--scrim-flat)] opacity-0 transition-opacity duration-200 ease-evade group-hover/episode:opacity-100">
                  <span className="surface-glass flex size-10 items-center justify-center rounded-full border border-border">
                    <Play size={18} strokeWidth={1.5} />
                  </span>
                </span>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5 py-1">
                <span className="font-display text-title-3 font-medium">
                  {episode.number}. {episode.title}
                </span>
                {episode.duration ? (
                  <span className="font-mono text-body-sm text-muted-foreground">
                    {formatDuration(episode.duration)}
                  </span>
                ) : null}
                {episode.description ? (
                  <p className="line-clamp-2 max-w-(--max-prose) text-body-sm text-muted-foreground">
                    {episode.description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
