import type { Metadata } from "next";

import { CollectionGrid } from "@/components/catalog/collection-grid";
import { StateBlock } from "@/components/feedback/state-block";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { collectionsService } from "@/lib/api/services/collections.service";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale } from "@/lib/i18n/locale";

// Shelves are authored in the Django admin and a dynamic one recomputes on the
// backend's own schedule; a minute of staleness is the same bargain the home
// page makes.
export const revalidate = 60;

/**
 * Enough covers for a card's collage and no more. Collections here are links,
 * not content — asking for each one's full contents to render a handful of
 * thumbnails would make the index the most expensive page on the site.
 */
const COVER_ITEMS = 5;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections">): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.collections.title, description: t.collections.description };
}

export default async function CollectionsPage({ params }: PageProps<"/[locale]/collections">) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  const page = await collectionsService
    .listCollections({ expand: "items", items_limit: COVER_ITEMS }, locale)
    .catch(() => null);

  if (!page) {
    return <StateBlock title={t.error.offline} hint={t.error.offlineHint} />;
  }

  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading
          overline={t.collections.overline}
          title={t.collections.title}
          description={t.collections.description}
          note={page.total > 0 ? t.collections.count(page.total) : undefined}
        />

        {/* No count under a card: only `COVER_ITEMS` of each shelf were fetched,
            so any number shown here would be that limit rather than the shelf's
            size. The collection's own page has the real one. */}
        {page.items.length > 0 ? (
          <CollectionGrid collections={page.items} />
        ) : (
          <StateBlock title={t.collections.empty} hint={t.collections.emptyHint} />
        )}
      </div>
    </PageSection>
  );
}
