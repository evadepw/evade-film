import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { catalogService } from "@/lib/api/services/catalog.service";
import { parseFiltersFromSearchParams, toListParams } from "@/lib/catalog-filters";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale } from "@/lib/i18n/locale";



/**
 * Reading `searchParams` makes this route dynamic, which is the point: page one
 * is resolved here, for whatever the request asked for, so the grid is in the
 * HTML. Statically rendered, `useSearchParams` inside `CatalogBrowser` bails the
 * subtree to the client and this page shipped a skeleton and nothing else — a
 * crawler following the sitemap into the catalogue found no titles at all.
 */
export default async function MoviesPage({ params, searchParams }: PageProps<"/[locale]/movies">) {
  const t = getDictionary(toLocale((await params).locale));
  const filters = parseFiltersFromSearchParams(await searchParams);

  // A failed listing is not a failed page: the browser retries client-side and
  // shows its own error state with a retry button.
  const initialPage = await catalogService
    .listMovies({ ...toListParams(filters), page: 1 }, toLocale((await params).locale))
    .catch(() => null);

  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading overline={t.catalog.overline} title={t.catalog.moviesTitle} />
        {/* `CatalogBrowser` reads the URL, so it needs a Suspense boundary. */}
        <Suspense fallback={<TitleGridSkeleton />}>
          <CatalogBrowser kind="movie" initialPage={initialPage} />
        </Suspense>
      </div>
    </PageSection>
  );
}
