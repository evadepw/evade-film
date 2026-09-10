import { CollectionRail } from "@/components/catalog/collection-rail";
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
import { collectionsService } from "@/lib/api/services/collections.service";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale, type AppLocale } from "@/lib/i18n/locale";
import { localeRoutes } from "@/lib/routes";
import type { Collection, Page, TitleDetail, TitleSummary } from "@/lib/domain/models";

// The catalogue is authored in the Django admin; a minute of staleness is fine
// and keeps the home page off the API on every request.
export const revalidate = 60;

/** How many titles the hero deck holds, at most. */
const FEATURED_COUNT = 5;

/** Cards per shelf. A rail scrolls; past this it is a page, not a row. */
const RAIL_ITEMS = 20;

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
async function listOrNull<T>(load: Promise<Page<T>>): Promise<Page<T> | null> {
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

  /*
   * One collections request carries every shelf and its cards (`expand=items`),
   * so the editorial half of this page costs a single round trip no matter how
   * many rows the admin has authored. The two catalogue listings stay: they
   * feed the full-catalogue grid at the foot, and they are what the page falls
   * back to when no shelf has been published yet.
   */
  const [collections, movies, series] = await Promise.all([
    listOrNull(
      collectionsService.listCollections({ expand: "items", items_limit: RAIL_ITEMS }, locale),
    ),
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

  const shelves = collections?.items ?? [];
  // The shelf the admin flagged as main is the hero and nothing else; every
  // other one becomes a rail, in the order `position` puts them in.
  const main = shelves.find((shelf) => shelf.isMain) ?? null;
  const rails: Collection[] = shelves.filter((shelf) => !shelf.isMain);

  /*
   * The hero draws from the featured shelf when there is one, and from the
   * newest titles otherwise. Falling back rather than going without: a home
   * page whose opening statement disappears because nobody ticked a checkbox
   * in the admin is a worse outcome than one that picks for itself.
   */
  const heroCandidates = main?.items?.length ? main.items : [...movieItems, ...seriesItems];
  const featured = await loadFeatured(heroCandidates, locale);
  const inHero = new Set(featured.map((title) => `${title.kind}-${title.id}`));

  // Everything the catalogue has, newest first — the rails show what is new or
  // curated, this shows how much there is.
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
              overline={main?.title}
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

        {rails.length > 0 ? (
          rails.map((collection) => (
            <CollectionRail
              key={collection.id}
              collection={collection}
              overline={t.collections.overline}
            />
          ))
        ) : (
          /*
           * No shelves published — the catalogue's own two rows stand in, so a
           * fresh install still has a home page rather than a hero over a grid.
           */
          <>
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
          </>
        )}

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
