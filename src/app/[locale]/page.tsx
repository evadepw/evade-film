import { ContinueWatchingRail } from "@/components/catalog/continue-watching-rail";
import { Hero } from "@/components/catalog/hero";
import { HeroCarousel } from "@/components/catalog/hero-carousel";
import { TitleGrid } from "@/components/catalog/title-grid";
import { TitleRail } from "@/components/catalog/title-rail";
import { SectionBoundary } from "@/components/feedback/section-boundary";
import { StateBlock } from "@/components/feedback/state-block";
import { PageSection } from "@/components/layout/page-section";
import { SectionHeader } from "@/components/layout/section-header";
import { catalogService } from "@/lib/api/services/catalog.service";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale, type AppLocale } from "@/lib/i18n/locale";
import { localeRoutes } from "@/lib/routes";
import type { Page, TitleDetail, TitleSummary } from "@/lib/domain/models";

// The catalogue is authored in the Django admin; a minute of staleness is fine
// and keeps the home page off the API on every request.
export const revalidate = 60;

/** How many titles the hero deck holds, at most. */
const FEATURED_COUNT = 5;

/**
 * The titles the hero shows. It needs a backdrop and a synopsis, which only the
 * detail endpoint has, so the summaries are resolved one detail call each.
 *
 * Twice the deck's size is asked for and the misses are dropped: a draft, a
 * deleted title or one that never got artwork should cost the hero a slide,
 * not leave a hole in it. The calls go out together — five of them in sequence
 * would be five round trips on the page's critical path.
 */
async function loadFeatured(
  candidates: TitleSummary[],
  locale: AppLocale,
): Promise<TitleDetail[]> {
  const settled = await Promise.allSettled(
    candidates
      .slice(0, FEATURED_COUNT * 2)
      .map((candidate) =>
        candidate.kind === "movie"
          ? catalogService.getMovie(candidate.id, locale)
          : catalogService.getSeries(candidate.id, locale),
      ),
  );

  const featured: TitleDetail[] = [];
  for (const result of settled) {
    if (featured.length === FEATURED_COUNT) break;
    if (result.status !== "fulfilled") continue;
    if (!result.value.backdrop && !result.value.poster) continue;
    featured.push(result.value);
  }
  return featured;
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

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const routes = localeRoutes(locale);
  const [movies, series] = await Promise.all([
    listOrNull(catalogService.listMovies({ ordering: "-created_at" }, locale)),
    listOrNull(catalogService.listSeries({ ordering: "-created_at" }, locale)),
  ]);

  if (!movies && !series) {
    return <StateBlock title={t.error.offline} hint={t.error.offlineHint} />;
  }

  const movieItems = movies?.items ?? [];
  const seriesItems = series?.items ?? [];

  if (movieItems.length === 0 && seriesItems.length === 0) {
    return <StateBlock title={t.empty.catalog} hint={t.empty.catalogHint} />;
  }

  const featured = await loadFeatured([...movieItems, ...seriesItems], locale);
  const inHero = new Set(featured.map((title) => `${title.kind}-${title.id}`));

  // Everything the catalogue has, newest first — the rails show what is new,
  // this shows how much there is. Without it the page ends after two rows.
  const everything = [...movieItems, ...seriesItems]
    .filter((item) => !inHero.has(`${item.kind}-${item.id}`))
    .sort((a, b) => a.title.localeCompare(b.title, locale));

  const total = (movies?.total ?? 0) + (series?.total ?? 0);

  return (
    <div className="flex flex-col gap-14 pb-24">
      {featured.length > 0 ? (
        <HeroCarousel>
          {featured.map((title, position) => (
            <Hero
              key={`${title.kind}-${title.id}`}
              title={title}
              locale={locale}
              priority={position === 0}
            />
          ))}
        </HeroCarousel>
      ) : (
        <div className="h-14" />
      )}

      <PageSection className="flex flex-col gap-14">
        {/*
         * Client island above the rails: it needs a session, and it renders
         * nothing at all when there is none — so the page keeps its shape for
         * a signed-out visitor instead of leaving a gap.
         */}
        <SectionBoundary>
          <ContinueWatchingRail />
        </SectionBoundary>

        <TitleRail
          overline={t.home.movies}
          title={t.home.newMovies}
          note={movies ? t.catalog.titles(movies.total) : undefined}
          items={movieItems}
          actionHref={routes.movies}
        />
        <TitleRail
          overline={t.home.series}
          title={t.home.newSeries}
          note={series ? t.catalog.titles(series.total) : undefined}
          items={seriesItems}
          actionHref={routes.seriesList}
        />

        {everything.length > 0 ? (
          <section>
            <SectionHeader
              overline={t.home.inCatalog}
              title={t.home.allTitles}
              note={t.catalog.titles(total)}
              className="mb-8"
            />
            <TitleGrid items={everything} />
          </section>
        ) : null}
      </PageSection>
    </div>
  );
}
