import type { Metadata } from "next";

import { TitleGrid } from "@/components/catalog/title-grid";
import { StateBlock } from "@/components/feedback/state-block";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { collectionsService } from "@/lib/api/services/collections.service";
import { orNotFound } from "@/lib/api/not-found";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale, type AppLocale } from "@/lib/i18n/locale";
import { getSiteUrl } from "@/lib/site";
import type { Collection } from "@/lib/domain/models";

export const revalidate = 60;

/** The endpoint's ceiling. A shelf longer than this is paged by the backend. */
const MAX_ITEMS = 100;

function load(slug: string, locale: AppLocale): Promise<Collection> {
  return collectionsService.getCollectionBySlug(slug, { items_limit: MAX_ITEMS }, locale);
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  try {
    const [collection, site] = await Promise.all([load(slug, toLocale(locale)), getSiteUrl()]);
    const url = site ? new URL(collection.href, site).toString() : undefined;
    const image = collection.backdrop ?? collection.poster ?? undefined;

    return {
      title: collection.title,
      description: collection.description ?? undefined,
      alternates: url ? { canonical: url } : undefined,
      openGraph: {
        type: "website",
        title: collection.title,
        description: collection.description ?? undefined,
        url,
        images: image,
      },
    };
  } catch {
    return {};
  }
}

export default async function CollectionPage({ params }: PageProps<"/[locale]/collections/[slug]">) {
  const { slug, locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDictionary(locale);

  // A slug that matches nothing is spelled 404 by the service, so a typo and a
  // deleted shelf reach the same not-found boundary.
  const collection = await orNotFound(load(slug, locale));
  const items = collection.items ?? [];

  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeading
          overline={t.collections.overline}
          title={collection.title}
          description={collection.description ?? undefined}
          note={items.length > 0 ? t.catalog.titles(items.length) : undefined}
        />

        {items.length > 0 ? (
          <TitleGrid items={items} />
        ) : (
          <StateBlock title={t.collections.emptyItems} hint={t.collections.emptyItemsHint} />
        )}
      </div>
    </PageSection>
  );
}
