import type { Metadata } from "next";

import { LOCALES, type AppLocale } from "@/lib/i18n/locale";
import type { FoundEpisode } from "@/lib/episodes";
import type { TitleDetail } from "@/lib/domain/models";

/**
 * schema.org for a title.
 *
 * A catalogue's rich result is the whole point of structured data here: the
 * poster, the year and the star rating are what a search listing shows, and
 * none of them are inferable from the page's prose.
 */
export interface TitleJsonLdInput {
  title: TitleDetail;
  /** Absolute, or null when no origin is configured — see `lib/site.ts`. */
  url: string | null;
  image: string | null;
}

/** Minutes to the ISO 8601 duration schema.org expects: 128 → `PT2H8M`. */
export function isoDuration(minutes: number | null): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${rest || !hours ? `${rest}M` : ""}`;
}

export function titleJsonLd({ title, url, image }: TitleJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": title.kind === "movie" ? "Movie" : "TVSeries",
    name: title.title,
    alternateName: title.originalTitle ?? undefined,
    description: title.shortDescription ?? title.description ?? undefined,
    url: url ?? undefined,
    image: image ?? undefined,
    // A bare year is a valid ISO 8601 date, and it is all the catalogue stores.
    datePublished: title.year ? String(title.year) : undefined,
    countryOfOrigin: title.country ? { "@type": "Country", name: title.country } : undefined,
    contentRating: title.ageRating ?? undefined,
    duration: title.kind === "movie" ? isoDuration(title.duration) : undefined,
    numberOfSeasons: title.kind === "series" ? (title.seasonCount ?? undefined) : undefined,
    // Omitted rather than sent as zero: an aggregate rating with no votes
    // behind it is the kind of thing that gets structured data ignored.
    aggregateRating:
      title.rating !== null && title.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: title.rating,
            ratingCount: title.ratingCount,
            bestRating: 10,
            worstRating: 0,
          }
        : undefined,
  };
}

/**
 * Share card and canonical for a title page.
 *
 * URLs are built absolute here rather than left relative for `metadataBase` to
 * resolve: when no origin is configured that base falls back to localhost, and
 * a canonical tag pointing at localhost in production is worse than no tag.
 */
export function titleMetadata(title: TitleDetail, site: URL | null, locale: AppLocale): Metadata {
  const description = title.shortDescription ?? title.description ?? undefined;
  const image = title.backdrop ?? title.poster ?? undefined;
  const url = site ? new URL(title.href, site).toString() : undefined;

  return {
    title: title.title,
    description,
    alternates: url ? { canonical: url, languages: alternates(title.href, site, locale) } : undefined,
    openGraph: {
      type: title.kind === "movie" ? "video.movie" : "video.tv_show",
      title: title.title,
      description,
      url,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: title.title,
      description,
      images: image,
    },
  };
}

/**
 * The same page in every language it exists in.
 *
 * Built by swapping the locale segment rather than rebuilding the route: the
 * path below the prefix is identical across languages, and ids do not
 * translate.
 */
function alternates(href: string, site: URL | null, locale: AppLocale): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((tag) => {
      const path = href.replace(`/${locale}`, `/${tag}`);
      return [tag, site ? new URL(path, site).toString() : path];
    }),
  );
}

/* --- Episodes ------------------------------------------------------------- */

/** «Чернобыль · S1E3» — the label an episode is known by, in listings and titles. */
export function episodeLabel(found: FoundEpisode): string {
  return `S${found.season.number}E${found.episode.number}`;
}

export function episodeMetadata(
  series: TitleDetail,
  found: FoundEpisode,
  site: URL | null,
  locale: AppLocale,
): Metadata {
  const title = `${found.episode.title} · ${episodeLabel(found)}`;
  const description = found.episode.description ?? series.shortDescription ?? undefined;
  const image = found.episode.thumbnail ?? series.backdrop ?? series.poster ?? undefined;
  const url = site ? new URL(found.href, site).toString() : undefined;

  return {
    title,
    description,
    alternates: url ? { canonical: url, languages: alternates(found.href, site, locale) } : undefined,
    openGraph: {
      type: "video.episode",
      title: `${series.title} — ${title}`,
      description,
      url,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: `${series.title} — ${title}`,
      description,
      images: image,
    },
  };
}

export function episodeJsonLd({
  series,
  found,
  url,
}: {
  series: TitleDetail;
  found: FoundEpisode;
  url: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    name: found.episode.title,
    episodeNumber: found.episode.number,
    description: found.episode.description ?? undefined,
    url: url ?? undefined,
    image: found.episode.thumbnail ?? undefined,
    timeRequired: isoDuration(found.episode.duration),
    partOfSeason: {
      "@type": "TVSeason",
      seasonNumber: found.season.number,
      name: found.season.title,
    },
    // The series is named here rather than linked: schema.org wants the parent
    // work, and repeating its title is what makes the episode identifiable in a
    // result that shows nothing else.
    partOfSeries: {
      "@type": "TVSeries",
      name: series.title,
      numberOfSeasons: series.seasonCount ?? undefined,
    },
  };
}
