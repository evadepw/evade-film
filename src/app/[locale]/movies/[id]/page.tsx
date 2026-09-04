import type { Metadata } from "next";

import { TitleDetailView } from "@/components/catalog/title-detail-view";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";
import { JsonLd } from "@/components/seo/json-ld";
import { titleJsonLd, titleMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";
import { toLocale } from "@/lib/i18n/locale";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[locale]/movies/[id]">): Promise<Metadata> {
  const { id, locale } = await params;
  try {
    const [movie, site] = await Promise.all([catalogService.getMovie(id, toLocale(locale)), getSiteUrl()]);
    return titleMetadata(movie, site, toLocale(locale));
  } catch {
    return {};
  }
}

export default async function MoviePage({ params }: PageProps<"/[locale]/movies/[id]">) {
  const { id, locale } = await params;
  const movie = await orNotFound(catalogService.getMovie(id, toLocale(locale)));

  // The catalogue has no relations, so "similar" is the rest of the same kind.
  // A rail here is worth more than an empty half-page.
  const similar = await catalogService
    .listMovies({ ordering: "-created_at" }, toLocale(locale))
    .then((page) => page.items.filter((item) => item.id !== movie.id).slice(0, 12))
    .catch(() => []);

  const site = await getSiteUrl();

  return (
    <>
      {/* Rich results for a catalogue are the poster, the year and the score —
          none of which a crawler can read off the page's prose. */}
      <JsonLd
        data={titleJsonLd({
          title: movie,
          url: site ? new URL(movie.href, site).toString() : null,
          image: movie.backdrop ?? movie.poster,
        })}
      />
      <TitleDetailView title={movie} similar={similar} locale={toLocale(locale)} />
    </>
  );
}
