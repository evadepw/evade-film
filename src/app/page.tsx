import { ContinueWatchingRail } from "@/components/catalog/continue-watching-rail";
import { Hero } from "@/components/catalog/hero";
import { TitleGrid } from "@/components/catalog/title-grid";
import { TitleRail } from "@/components/catalog/title-rail";
import { StateBlock } from "@/components/feedback/state-block";
import { PageSection } from "@/components/layout/page-section";
import { SectionHeader } from "@/components/layout/section-header";
import { catalogService } from "@/lib/api/services/catalog.service";
import { dictionary } from "@/lib/i18n/dictionary";
import { routes } from "@/lib/routes";
import type { Page, TitleDetail, TitleSummary } from "@/lib/domain/models";

// The catalogue is authored in the Django admin; a minute of staleness is fine
// and keeps the home page off the API on every request.
export const revalidate = 60;

/** The hero needs a backdrop and a synopsis, which only the detail endpoint has. */
async function loadFeatured(candidates: TitleSummary[]): Promise<TitleDetail | null> {
  for (const candidate of candidates.slice(0, 3)) {
    try {
      const detail =
        candidate.kind === "movie"
          ? await catalogService.getMovie(candidate.id)
          : await catalogService.getSeries(candidate.id);
      if (detail.backdrop || detail.poster) return detail;
    } catch {
      // A draft or a deleted title — try the next candidate.
    }
  }
  return null;
}

/**
 * The home page is prerendered, so it must survive a cold or unreachable API:
 * a failed build is worse than a page that says the service is unavailable.
 */
async function listOrNull(load: Promise<Page<TitleSummary>>): Promise<Page<TitleSummary> | null> {
  try {
    return await load;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [movies, series] = await Promise.all([
    listOrNull(catalogService.listMovies({ ordering: "-created_at" })),
    listOrNull(catalogService.listSeries({ ordering: "-created_at" })),
  ]);

  if (!movies && !series) {
    return <StateBlock title={dictionary.error.offline} hint={dictionary.error.offlineHint} />;
  }

  const movieItems = movies?.items ?? [];
  const seriesItems = series?.items ?? [];

  if (movieItems.length === 0 && seriesItems.length === 0) {
    return <StateBlock title={dictionary.empty.catalog} hint={dictionary.empty.catalogHint} />;
  }

  const featured = await loadFeatured([...movieItems, ...seriesItems]);

  // Everything the catalogue has, newest first — the rails show what is new,
  // this shows how much there is. Without it the page ends after two rows.
  const everything = [...movieItems, ...seriesItems]
    .filter((item) => item.id !== featured?.id || item.kind !== featured?.kind)
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));

  const total = (movies?.total ?? 0) + (series?.total ?? 0);

  return (
    <div className="flex flex-col gap-14 pb-24">
      {featured ? <Hero title={featured} /> : <div className="h-14" />}

      <PageSection className="flex flex-col gap-14">
        {/*
         * Client island above the rails: it needs a session, and it renders
         * nothing at all when there is none — so the page keeps its shape for
         * a signed-out visitor instead of leaving a gap.
         */}
        <ContinueWatchingRail />

        <TitleRail
          overline={dictionary.home.movies}
          title={dictionary.home.newMovies}
          note={movies ? dictionary.catalog.titles(movies.total) : undefined}
          items={movieItems}
          actionHref={routes.movies}
        />
        <TitleRail
          overline={dictionary.home.series}
          title={dictionary.home.newSeries}
          note={series ? dictionary.catalog.titles(series.total) : undefined}
          items={seriesItems}
          actionHref={routes.seriesList}
        />

        {everything.length > 0 ? (
          <section>
            <SectionHeader
              overline={dictionary.home.inCatalog}
              title={dictionary.home.allTitles}
              note={dictionary.catalog.titles(total)}
              className="mb-8"
            />
            <TitleGrid items={everything} />
          </section>
        ) : null}
      </PageSection>
    </div>
  );
}
