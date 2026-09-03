import { Suspense } from "react";
import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { dictionary } from "@/lib/i18n/dictionary";

export const metadata: Metadata = {
  title: dictionary.catalog.moviesTitle,
};

export default function MoviesPage() {
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading overline="Каталог" title={dictionary.catalog.moviesTitle} />
        {/* `CatalogBrowser` reads the URL, so it needs a Suspense boundary. */}
        <Suspense fallback={<TitleGridSkeleton />}>
          <CatalogBrowser kind="movie" />
        </Suspense>
      </div>
    </PageSection>
  );
}
