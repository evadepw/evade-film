import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { MoviePlayer } from "@/components/player/movie-player";
import { StateBlock } from "@/components/feedback/state-block";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";
import { dictionary } from "@/lib/i18n/dictionary";
import { formatDuration, joinMeta } from "@/lib/format";
import type { PlaybackSource } from "@/lib/domain/models";

// Manifest URLs are signed and short-lived, so this page is never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/movies/[id]/watch">): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await catalogService.getMovie(id);
    return { title: `${movie.title} · ${dictionary.player.title}` };
  } catch {
    return { title: dictionary.player.title };
  }
}

export default async function WatchMoviePage({ params }: PageProps<"/movies/[id]/watch">) {
  const { id } = await params;
  const movie = await orNotFound(catalogService.getMovie(id));

  const facts: Array<[string, string]> = [
    movie.originalTitle ? [dictionary.title.original, movie.originalTitle] : null,
    movie.ageRating ? [dictionary.title.ageRating, movie.ageRating] : null,
    movie.audioTracks.length
      ? [dictionary.title.voiceover, movie.audioTracks.map((track) => track.label).join(" · ")]
      : null,
    movie.subtitleTracks.length
      ? [dictionary.title.subtitles, movie.subtitleTracks.map((track) => track.label).join(" · ")]
      : [dictionary.title.subtitles, dictionary.title.noSubtitles],
  ].filter((entry): entry is [string, string] => entry !== null);

  // A title can exist in the catalogue before its video finishes transcoding.
  let source: PlaybackSource | null = null;
  try {
    source = await catalogService.getMoviePlayback(id);
  } catch {
    source = null;
  }

  return (
    <div className="bg-[var(--surface-page-deep)] pb-24">
      <PageSection className="pt-6">
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link href={movie.href}>
            <ChevronLeft strokeWidth={1.5} />
            {dictionary.action.back}
          </Link>
        </Button>

        {source ? (
          <MoviePlayer
            movieId={movie.id}
            title={movie.title}
            poster={movie.backdrop ?? movie.poster}
            initialSource={source}
            audioTracks={movie.audioTracks}
          />
        ) : (
          <StateBlock title={dictionary.empty.playback} hint={dictionary.empty.playbackHint} />
        )}

        <div className="mt-8 grid gap-14 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-3">
            <h1 className="text-title-1 font-medium">{movie.title}</h1>
            <p className="text-body-sm text-muted-foreground">
              {joinMeta([movie.year, movie.country, formatDuration(movie.duration)])}
            </p>
            {movie.description ? (
              <p className="mt-2 max-w-(--max-prose) text-body text-muted-foreground">
                {movie.description}
              </p>
            ) : null}
          </div>

          <dl className="flex flex-col gap-4 border-t border-[var(--border-hairline)] pt-5 md:border-t-0 md:pt-0">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="type-label text-muted-foreground">{label}</dt>
                <dd className="mt-1.5 text-body-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </PageSection>
    </div>
  );
}
