import Link from "next/link";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EpisodeList } from "@/components/catalog/episode-list";
import { TitleRail } from "@/components/catalog/title-rail";
import { SectionBoundary } from "@/components/feedback/section-boundary";
import { CommentsSection } from "@/components/interactions/comments-section";
import { RatingControl } from "@/components/interactions/rating-control";
import { WatchlistButton } from "@/components/interactions/watchlist-button";
import { Poster } from "@/components/media/poster";
import { PageSection } from "@/components/layout/page-section";
import { SectionHeader } from "@/components/layout/section-header";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locale";
import { formatDuration, joinMeta } from "@/lib/format";
import { localeRoutes } from "@/lib/routes";
import type { TitleDetail, TitleSummary } from "@/lib/domain/models";

export interface TitleDetailViewProps {
  /** Resolved by the page from its `[locale]` segment. */
  locale: AppLocale;
  title: TitleDetail;
  /** Same-kind titles for the rail at the bottom. Already excludes this one. */
  similar?: TitleSummary[];
}

/**
 * The title page: a 21:9 still fading into the page, the poster overlapping it,
 * then the facts. Nothing here borrows colour from the artwork — the frame
 * stays ink and silver.
 *
 * There are no tabs. With one synopsis and seven facts, tabs hid half of a
 * short page behind a click and left the other half looking empty; a single
 * column of sections reads as minimal rather than unfinished.
 */
export function TitleDetailView({ title, similar = [], locale }: TitleDetailViewProps) {
  const t = getDictionary(locale);
  const routes = localeRoutes(locale);
  const watchHref =
    title.kind === "movie" ? routes.watchMovie(title.id) : routes.watchSeries(title.id);

  const meta = joinMeta([
    title.year,
    title.country,
    title.kind === "movie"
      ? formatDuration(title.duration)
      : title.seasonCount
        ? t.title.seasons(title.seasonCount)
        : null,
  ]);

  const episodeCount = title.seasons.reduce((sum, season) => sum + season.episodes.length, 0);

  // Distinct, in the order the API listed them — several tracks share a studio.
  const studios = [...new Set(title.audioTracks.map((track) => track.studio).filter(Boolean))];

  const facts: Array<[string, string]> = [
    title.originalTitle ? [t.title.original, title.originalTitle] : null,
    title.year ? [t.title.year, String(title.year)] : null,
    title.country ? [t.title.country, title.country] : null,
    title.kind === "movie" && title.duration
      ? [t.title.duration, formatDuration(title.duration) ?? ""]
      : null,
    title.kind === "series" && episodeCount
      ? [t.title.episodes, t.title.episodesCount(episodeCount)]
      : null,
    title.ageRating ? [t.title.ageRating, title.ageRating] : null,
    title.audioTracks.length
      ? [t.title.voiceover, title.audioTracks.map((t) => t.label).join(" · ")]
      : null,
    // Studios on a line of their own. Inside the track label they are a
    // parenthetical — «Русский (LostFilm)» — and which studios dubbed a title
    // is a thing people choose by.
    studios.length ? [t.title.studios, studios.join(" · ")] : null,
    [
      t.title.subtitles,
      title.subtitleTracks.length
        ? title.subtitleTracks.map((t) => t.label).join(" · ")
        : t.title.noSubtitles,
    ],
  ].filter((entry): entry is [string, string] => entry !== null);

  return (
    <div className="flex flex-col gap-14 pb-24">
      <div>
        <div className="relative h-[280px] md:h-[420px]">
          <Poster
            src={title.backdrop ?? title.poster}
            alt={title.title}
            ratio="wide"
            rounded={false}
            priority
            sizes="100vw"
            className="h-full shadow-none"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,var(--ink-1)_0%,rgba(16,17,19,0.2)_70%)]"
          />
        </div>

        <PageSection className="relative -mt-24 md:-mt-[140px]">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:gap-10">
            <div className="w-[150px] shrink-0 md:w-[220px]">
              <Poster src={title.poster} alt={title.title} ratio="poster" sizes="220px" priority />
            </div>

            <div className="flex flex-1 flex-col gap-4 pb-2">
              <h1 className="text-display-3 font-light md:text-display-2">{title.title}</h1>

              <div className="flex flex-wrap items-center gap-2.5 text-body-sm text-muted-foreground">
                {meta ? <span>{meta}</span> : null}
                {title.ageRating ? <Badge variant="outline">{title.ageRating}</Badge> : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="chrome" size="lg">
                  <Link href={watchHref}>
                    <Play strokeWidth={1.5} />
                    {t.action.watch}
                  </Link>
                </Button>
                {title.trailerUrl ? (
                  <Button asChild variant="outline" size="lg">
                    <a href={title.trailerUrl} target="_blank" rel="noreferrer">
                      {t.action.trailer}
                    </a>
                  </Button>
                ) : null}
                {/*
                 * Client island: the shelf row belongs to the viewer, and the
                 * page around it is rendered anonymously on the server.
                 */}
                <SectionBoundary>
                  <WatchlistButton type={title.kind} id={title.id} size="lg" />
                </SectionBoundary>
              </div>
            </div>
          </div>
        </PageSection>
      </div>

      <PageSection>
        <SectionHeader title={t.title.overview} className="mb-8" />

        <div className="flex flex-col gap-10">
          {/*
           * Synopsis left, rating right. A two-line synopsis on its own left a
           * half-empty band under the hero; the scale fills it with something
           * the page was missing anyway.
           */}
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            <p className="max-w-(--max-prose) text-title-3 text-muted-foreground">
              {title.description ?? title.shortDescription ?? t.title.noDescription}
            </p>

            <SectionBoundary>
              <RatingControl
                type={title.kind}
                id={title.id}
                // The detail response carries the average already; the histogram
                // and «ваша оценка» arrive with the client request behind it.
                initial={{
                  average: title.rating,
                  count: title.ratingCount,
                  distribution: Array.from({ length: 11 }, () => 0),
                  myRating: null,
                }}
              />
            </SectionBoundary>
          </div>

          {/*
           * Facts run across, not down. A synopsis is two lines and the fact
           * list is eight rows — side by side that leaves a column-high hole,
           * which is exactly what makes a spare page look unfinished.
           */}
          <dl className="grid grid-cols-2 gap-x-10 gap-y-6 border-t border-[var(--border-hairline)] pt-8 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="type-label text-[var(--text-disabled)]">{label}</dt>
                <dd className="mt-2 text-body-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </PageSection>

      {title.kind === "series" && title.seasons.length > 0 ? (
        <PageSection>
          <SectionHeader
            title={t.title.episodes}
            note={episodeCount ? t.title.episodesCount(episodeCount) : undefined}
            className="mb-8"
          />
          <EpisodeList seriesId={title.id} seasons={title.seasons} />
        </PageSection>
      ) : null}

      <PageSection>
        <SectionBoundary>
          <CommentsSection type={title.kind} id={title.id} />
        </SectionBoundary>
      </PageSection>

      {similar.length > 0 ? (
        <PageSection>
          <TitleRail
            overline={t.home.similar}
            title={title.kind === "movie" ? t.home.movies : t.home.series}
            items={similar}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
