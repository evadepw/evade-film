import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionBoundary } from "@/components/feedback/section-boundary";
import { CommentsSection } from "@/components/interactions/comments-section";
import { RatingControl } from "@/components/interactions/rating-control";
import { Poster } from "@/components/media/poster";
import { PageSection } from "@/components/layout/page-section";
import { SectionHeader } from "@/components/layout/section-header";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locale";
import { formatCount, formatDuration } from "@/lib/format";
import { episodeLabel } from "@/lib/seo";
import { localeRoutes } from "@/lib/routes";
import type { FoundEpisode } from "@/lib/episodes";
import type { TitleDetail } from "@/lib/domain/models";

export interface EpisodeDetailViewProps {
  /** Resolved by the page from its `[locale]` segment. */
  locale: AppLocale;
  series: TitleDetail;
  found: FoundEpisode;
}

/**
 * One episode's page.
 *
 * The series page lists episodes; this is where a single one can be linked,
 * rated and argued about. The backend has kept per-episode ratings and comment
 * threads all along — `ContentType` includes `episode` — and until now nothing
 * in the interface could reach them.
 */
export function EpisodeDetailView({ series, found, locale }: EpisodeDetailViewProps) {
  const t = getDictionary(locale);
  const routes = localeRoutes(locale);
  const { episode, season, previous, next } = found;
  const duration = formatDuration(episode.duration);

  return (
    <PageSection className="py-10 pb-24">
      <div className="mx-auto flex w-full max-w-(--container-content) flex-col gap-10">
        {/* The way back up. An episode read from search has no other context. */}
        <Link
          href={routes.series(series.id)}
          className="type-overline flex w-fit items-center gap-1.5 text-muted-foreground transition-colors duration-150 ease-evade hover:text-foreground"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
          {series.title}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
          <Poster
            src={episode.thumbnail}
            alt={episode.title}
            ratio="still"
            sizes="(max-width: 1024px) 100vw, 420px"
            priority
          />

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline">{episodeLabel(found)}</Badge>
              <span className="text-body-sm text-muted-foreground">{season.title}</span>
              {duration ? (
                <span className="text-body-sm text-muted-foreground">{duration}</span>
              ) : null}
              {episode.viewCount > 0 ? (
                <span className="text-body-sm text-muted-foreground">
                  {t.title.views(formatCount(episode.viewCount))}
                </span>
              ) : null}
            </div>

            <h1 className="text-display-3 font-light">{episode.title}</h1>

            {episode.description ? (
              <p className="max-w-(--max-prose) text-body text-muted-foreground">
                {episode.description}
              </p>
            ) : null}

            <div className="mt-1 flex flex-wrap gap-3">
              <Button asChild variant="chrome" size="lg">
                <Link href={found.watchHref}>
                  <Play strokeWidth={1.5} />
                  {t.action.watch}
                </Link>
              </Button>
            </div>

            <SectionBoundary>
              <RatingControl type="episode" id={episode.id} showDistribution={false} />
            </SectionBoundary>
          </div>
        </div>

        {/* Running order, not season order: the pair either side of this one. */}
        {previous || next ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-6">
            {previous ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.episode(series.id, previous.id)}>
                  <ChevronLeft strokeWidth={1.5} />
                  {previous.title}
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.episode(series.id, next.id)}>
                  {next.title}
                  <ChevronRight strokeWidth={1.5} />
                </Link>
              </Button>
            ) : null}
          </nav>
        ) : null}

        <section className="flex flex-col gap-6">
          <SectionHeader overline={t.comments.overline} title={t.comments.title} />
          <SectionBoundary>
            <CommentsSection type="episode" id={episode.id} />
          </SectionBoundary>
        </section>
      </div>
    </PageSection>
  );
}
