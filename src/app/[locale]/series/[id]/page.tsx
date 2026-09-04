import type { Metadata } from "next";

import { TitleDetailView } from "@/components/catalog/title-detail-view";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";
import { JsonLd } from "@/components/seo/json-ld";
import { titleJsonLd, titleMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";
import { toLocale } from "@/lib/i18n/locale";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[locale]/series/[id]">): Promise<Metadata> {
  const { id, locale } = await params;
  try {
    const [series, site] = await Promise.all([catalogService.getSeries(id, toLocale(locale)), getSiteUrl()]);
    return titleMetadata(series, site, toLocale(locale));
  } catch {
    return {};
  }
}

export default async function SeriesDetailPage({ params }: PageProps<"/[locale]/series/[id]">) {
  const { id, locale } = await params;
  const series = await orNotFound(catalogService.getSeries(id, toLocale(locale)));

  const similar = await catalogService
    .listSeries({ ordering: "-created_at" }, toLocale(locale))
    .then((page) => page.items.filter((item) => item.id !== series.id).slice(0, 12))
    .catch(() => []);

  const site = await getSiteUrl();

  return (
    <>
      {/* Rich results for a catalogue are the poster, the year and the score —
          none of which a crawler can read off the page's prose. */}
      <JsonLd
        data={titleJsonLd({
          title: series,
          url: site ? new URL(series.href, site).toString() : null,
          image: series.backdrop ?? series.poster,
        })}
      />
      <TitleDetailView title={series} similar={similar} locale={toLocale(locale)} />
    </>
  );
}
