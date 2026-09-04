import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { EpisodeDetailView } from "@/components/catalog/episode-detail-view";
import { JsonLd } from "@/components/seo/json-ld";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";
import { findEpisode } from "@/lib/episodes";
import { episodeJsonLd, episodeMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";
import { toLocale } from "@/lib/i18n/locale";

export const revalidate = 60;

/**
 * The episode is located in the series' own season tree rather than through
 * `/episodes/{id}/`. One request instead of two, the series title and its
 * siblings come along for the navigation below — and an episode id belonging to
 * some other series simply is not found, so the URL cannot be forged into a
 * page that mixes them.
 */
async function load(seriesId: string, episodeId: string) {
  const series = await orNotFound(catalogService.getSeries(seriesId));
  const found = findEpisode(series, Number(episodeId));
  return { series, found };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/series/[id]/episodes/[episodeId]">): Promise<Metadata> {
  const { id, episodeId, locale } = await params;
  try {
    const [{ series, found }, site] = await Promise.all([load(id, episodeId), getSiteUrl()]);
    if (!found) return {};
    return episodeMetadata(series, found, site, toLocale(locale));
  } catch {
    return {};
  }
}

export default async function EpisodePage({
  params,
}: PageProps<"/[locale]/series/[id]/episodes/[episodeId]">) {
  const { id, episodeId, locale } = await params;
  const [{ series, found }, site] = await Promise.all([load(id, episodeId), getSiteUrl()]);

  if (!found) notFound();

  return (
    <>
      <JsonLd
        data={episodeJsonLd({
          series,
          found,
          url: site ? new URL(found.href, site).toString() : null,
        })}
      />
      <EpisodeDetailView series={series} found={found} locale={toLocale(locale)} />
    </>
  );
}
