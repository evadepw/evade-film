import { Suspense } from "react";
import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { dictionary } from "@/lib/i18n/dictionary";

export const metadata: Metadata = {
  title: dictionary.catalog.seriesTitle,
};

export default function SeriesPage() {
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading overline="Каталог" title={dictionary.catalog.seriesTitle} />
        <Suspense fallback={<TitleGridSkeleton />}>
          <CatalogBrowser kind="series" />
        </Suspense>
      </div>
    </PageSection>
  );
}
