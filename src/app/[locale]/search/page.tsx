import { Suspense } from "react";
import type { Metadata } from "next";

import { SearchView } from "@/components/catalog/search-view";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale } from "@/lib/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.catalog.searchTitle };
}

export default async function SearchPage({ params }: PageProps<"/[locale]/search">) {
  const t = getDictionary(toLocale((await params).locale));
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading overline={t.catalog.overline} title={t.catalog.searchTitle} />
        <Suspense fallback={<TitleGridSkeleton count={8} />}>
          <SearchView />
        </Suspense>
      </div>
    </PageSection>
  );
}
