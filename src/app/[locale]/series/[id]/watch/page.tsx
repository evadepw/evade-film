import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { EpisodeStrip } from "@/components/catalog/episode-strip";
import { SeriesPlayer } from "@/components/player/series-player";
import { StateBlock } from "@/components/feedback/state-block";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale } from "@/lib/i18n/locale";
import { joinMeta } from "@/lib/format";
import type { SeriesPlayback } from "@/lib/domain/models";

// Manifest URLs are signed and short-lived, so this page is never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/series/[id]/watch">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = getDictionary(toLocale(locale));
  try {
    const series = await catalogService.getSeries(id);
    return { title: `${series.title} · ${t.player.title}` };
  } catch {
    return { title: t.player.title };
  }
}

function toNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function WatchSeriesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/series/[id]/watch">) {
  const { locale, id } = await params;
  const t = getDictionary(toLocale(locale));
  const query = await searchParams;

  const series = await orNotFound(catalogService.getSeries(id));

  // One batch call carries a signed manifest for every episode and voiceover,
  // so switching episodes inside the player never waits on the network.
  let playback: SeriesPlayback | null = null;
  try {
    playback = await catalogService.getSeriesPlayback(id);
  } catch {
    playback = null;
  }

  const hasPlayableEpisode = playback?.seasons.some((season) =>
    season.episodes.some((episode) => episode.manifestUrl),
  );

  const seasonNumber = toNumber(query.season);
  const episodeNumber = toNumber(query.episode);
  const currentSeason =
    series.seasons.find((season) => season.number === seasonNumber) ?? series.seasons[0];

  return (
    <div className="bg-[var(--surface-page-deep)] pb-24">
      <PageSection className="pt-6">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link href={series.href}>
            <ChevronLeft strokeWidth={1.5} />
            {t.action.back}
          </Link>
        </Button>

        {playback && hasPlayableEpisode ? (
          <SeriesPlayer
            // Remount when the URL names another episode, so a click in the
            // strip below lands on that episode instead of the remembered one.
            key={`${seasonNumber ?? 1}-${episodeNumber ?? 1}`}
            seriesId={series.id}
            seasons={series.seasons}
            playback={playback}
            poster={series.backdrop ?? series.poster}
            initialSeason={seasonNumber}
            initialEpisode={episodeNumber}
          />
        ) : (
          <StateBlock title={t.empty.playback} hint={t.empty.playbackHint} />
        )}

        <div className="mt-8 grid gap-14 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-3">
            <h1 className="text-title-1 font-medium">{series.title}</h1>
            <p className="text-body-sm text-muted-foreground">
              {joinMeta([
                series.year,
                series.country,
                series.seasonCount ? t.title.seasons(series.seasonCount) : null,
              ])}
            </p>
            {series.description ? (
              <p className="mt-2 max-w-(--max-prose) text-body text-muted-foreground">
                {series.description}
              </p>
            ) : null}
          </div>

          {currentSeason ? (
            <EpisodeStrip
              locale={toLocale(locale)}
              seriesId={series.id}
              season={currentSeason}
              activeNumber={episodeNumber ?? currentSeason.episodes[0]?.number}
            />
          ) : null}
        </div>
      </PageSection>
    </div>
  );
}
