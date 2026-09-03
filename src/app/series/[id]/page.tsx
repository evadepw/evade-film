import type { Metadata } from "next";

import { TitleDetailView } from "@/components/catalog/title-detail-view";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/series/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const series = await catalogService.getSeries(id);
    return {
      title: series.title,
      description: series.shortDescription ?? series.description ?? undefined,
      openGraph: {
        title: series.title,
        images: series.backdrop ?? series.poster ?? undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function SeriesDetailPage({ params }: PageProps<"/series/[id]">) {
  const { id } = await params;
  const series = await orNotFound(catalogService.getSeries(id));

  const similar = await catalogService
    .listSeries({ ordering: "-created_at" })
    .then((page) => page.items.filter((item) => item.id !== series.id).slice(0, 12))
    .catch(() => []);

  return <TitleDetailView title={series} similar={similar} />;
}
