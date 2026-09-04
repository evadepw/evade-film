import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { MoviePlayer } from "@/components/player/movie-player";
import { StateBlock } from "@/components/feedback/state-block";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { catalogService } from "@/lib/api/services/catalog.service";
import { orNotFound } from "@/lib/api/not-found";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale } from "@/lib/i18n/locale";
import { formatDuration, joinMeta } from "@/lib/format";
import type { PlaybackSource } from "@/lib/domain/models";

// Manifest URLs are signed and short-lived, so this page is never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/movies/[id]/watch">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = getDictionary(toLocale(locale));
  try {
    const movie = await catalogService.getMovie(id);
    return { title: `${movie.title} · ${t.player.title}` };
  } catch {
    return { title: t.player.title };
  }
}

export default async function WatchMoviePage({ params }: PageProps<"/[locale]/movies/[id]/watch">) {
  const { locale, id } = await params;
  const t = getDictionary(toLocale(locale));
  const movie = await orNotFound(catalogService.getMovie(id));

  const facts: Array<[string, string]> = [
    movie.originalTitle ? [t.title.original, movie.originalTitle] : null,
    movie.ageRating ? [t.title.ageRating, movie.ageRating] : null,
    movie.audioTracks.length
      ? [t.title.voiceover, movie.audioTracks.map((track) => track.label).join(" · ")]
      : null,
    movie.subtitleTracks.length
      ? [t.title.subtitles, movie.subtitleTracks.map((track) => track.label).join(" · ")]
      : [t.title.subtitles, t.title.noSubtitles],
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
            {t.action.back}
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
          <StateBlock title={t.empty.playback} hint={t.empty.playbackHint} />
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
