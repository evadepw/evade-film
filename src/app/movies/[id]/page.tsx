import type { Metadata } from "next";

import { TitleDetailView } from "@/components/catalog/title-detail-view";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/movies/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await catalogService.getMovie(id);
    return {
      title: movie.title,
      description: movie.shortDescription ?? movie.description ?? undefined,
      openGraph: {
        title: movie.title,
        images: movie.backdrop ?? movie.poster ?? undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function MoviePage({ params }: PageProps<"/movies/[id]">) {
  const { id } = await params;
  const movie = await orNotFound(catalogService.getMovie(id));

  // The catalogue has no relations, so "similar" is the rest of the same kind.
  // A rail here is worth more than an empty half-page.
  const similar = await catalogService
    .listMovies({ ordering: "-created_at" })
    .then((page) => page.items.filter((item) => item.id !== movie.id).slice(0, 12))
    .catch(() => []);

  return <TitleDetailView title={movie} similar={similar} />;
}
