import { Suspense } from "react";
import type { Metadata } from "next";

import { SearchView } from "@/components/catalog/search-view";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { dictionary } from "@/lib/i18n/dictionary";

export const metadata: Metadata = {
  title: dictionary.catalog.searchTitle,
};

export default function SearchPage() {
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading overline="Каталог" title={dictionary.catalog.searchTitle} />
        <Suspense fallback={<TitleGridSkeleton count={8} />}>
          <SearchView />
        </Suspense>
      </div>
    </PageSection>
  );
}
