import { describe, expect, it } from "vitest";

import { isoDuration, titleJsonLd, titleMetadata } from "@/lib/seo";
import type { TitleDetail } from "@/lib/domain/models";

function movie(overrides: Partial<TitleDetail> = {}): TitleDetail {
  return {
    id: 1,
    kind: "movie",
    title: "Всё везде и сразу",
    originalTitle: "Everything Everywhere All at Once",
    poster: "https://media.evade.test/poster.jpg",
    backdrop: "https://media.evade.test/backdrop.jpg",
    year: 2022,
    ageRating: "16+",
    country: "США",
    duration: 139,
    seasonCount: null,
    href: "/ru/movies/1",
    rating: 8.4,
    ratingCount: 120,
    commentCount: 3,
    viewCount: 900,
    description: "Мультивселенная в прачечной.",
    shortDescription: null,
    trailerUrl: null,
    audioTracks: [],
    subtitleTracks: [],
    seasons: [],
    ...overrides,
  };
}

const SITE = new URL("https://evade.test");

describe("isoDuration", () => {
  it.each([
    [139, "PT2H19M"],
    [60, "PT1H"],
    [45, "PT45M"],
    [90, "PT1H30M"],
  ])("renders %i minutes as %s", (minutes, expected) => {
    expect(isoDuration(minutes)).toBe(expected);
  });

  it.each([null, 0, -5])("has nothing to say about %s", (minutes) => {
    expect(isoDuration(minutes)).toBeUndefined();
  });
});

describe("titleJsonLd", () => {
  it("describes a movie", () => {
    const data = titleJsonLd({
      title: movie(),
      url: "https://evade.test/ru/movies/1",
      image: "https://media.evade.test/backdrop.jpg",
    });

    expect(data["@type"]).toBe("Movie");
    expect(data.name).toBe("Всё везде и сразу");
    expect(data.alternateName).toBe("Everything Everywhere All at Once");
    expect(data.datePublished).toBe("2022");
    expect(data.duration).toBe("PT2H19M");
    expect(data.contentRating).toBe("16+");
    expect(data.countryOfOrigin).toEqual({ "@type": "Country", name: "США" });
  });

  it("describes a series by season count, not runtime", () => {
    const data = titleJsonLd({
      title: movie({ kind: "series", duration: null, seasonCount: 3, href: "/series/1" }),
      url: "https://evade.test/series/1",
      image: null,
    });

    expect(data["@type"]).toBe("TVSeries");
    expect(data.numberOfSeasons).toBe(3);
    expect(data.duration).toBeUndefined();
  });

  it("carries the aggregate rating when there are votes behind it", () => {
    const data = titleJsonLd({ title: movie(), url: null, image: null });

    expect(data.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 8.4,
      ratingCount: 120,
      bestRating: 10,
      worstRating: 0,
    });
  });

  it.each([
    ["no votes", { rating: null, ratingCount: 0 }],
    ["a stale average with no votes", { rating: 8.4, ratingCount: 0 }],
  ])("omits the aggregate rating with %s", (_case, overrides) => {
    const data = titleJsonLd({ title: movie(overrides), url: null, image: null });
    expect(data.aggregateRating).toBeUndefined();
  });

  it("survives JSON.stringify without emitting nulls for absent facts", () => {
    const bare = movie({ originalTitle: null, year: null, country: null, ageRating: null });
    const json = JSON.parse(JSON.stringify(titleJsonLd({ title: bare, url: null, image: null })));

    expect(json).not.toHaveProperty("alternateName");
    expect(json).not.toHaveProperty("datePublished");
    expect(json).not.toHaveProperty("countryOfOrigin");
  });
});

describe("titleMetadata", () => {
  it("builds an absolute canonical from the configured origin", () => {
    const meta = titleMetadata(movie(), SITE, "ru");

    expect(meta.alternates?.canonical).toBe("https://evade.test/ru/movies/1");
    expect(meta.openGraph?.url).toBe("https://evade.test/ru/movies/1");
  });

  it("points every language at the same page", () => {
    // The two versions have to name each other, or they compete in the index.
    const meta = titleMetadata(movie(), SITE, "ru");

    expect(meta.alternates?.languages).toEqual({
      ru: "https://evade.test/ru/movies/1",
      en: "https://evade.test/en/movies/1",
    });
  });

  it("omits the canonical entirely when no origin is configured", () => {
    // Better no canonical than one pointing at whatever `metadataBase` falls
    // back to — which is localhost.
    const meta = titleMetadata(movie(), null, "ru");

    expect(meta.alternates).toBeUndefined();
    expect(meta.openGraph?.url).toBeUndefined();
  });

  it("prefers the backdrop over the poster for the share card", () => {
    expect(titleMetadata(movie(), SITE, "ru").openGraph?.images).toBe(
      "https://media.evade.test/backdrop.jpg",
    );
    expect(titleMetadata(movie({ backdrop: null }), SITE, "ru").openGraph?.images).toBe(
      "https://media.evade.test/poster.jpg",
    );
  });

  it("tags the OG type by kind", () => {
    expect(titleMetadata(movie(), SITE, "ru").openGraph).toMatchObject({ type: "video.movie" });
    expect(titleMetadata(movie({ kind: "series" }), SITE, "ru").openGraph).toMatchObject({
      type: "video.tv_show",
    });
  });
});
