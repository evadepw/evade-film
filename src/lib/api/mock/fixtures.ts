import type {
  MovieDetailDto,
  MovieListDto,
  OrganizationDto,
  SeriesDetailDto,
  SeriesListDto,
  SubtitleTrackDto,
  VoiceoverTrackDto,
} from "@/lib/api/types";

/**
 * Fixtures for the mock API.
 *
 * These are *wire* shapes, not domain models: the mock adapter feeds them to
 * the same services and mappers the real backend does, so translations,
 * null-handling and pagination all get exercised. Some titles deliberately
 * leave `poster`, `duration` or `translations.en` empty — that is what the
 * real catalogue looks like, and the UI has to survive it.
 */

/**
 * Zeroed aggregates. The catalogue fixtures are static, but views, ratings and
 * comments are not — the adapter overlays the live numbers from `./state` on
 * every response, so a title rated in mock mode shows its score on the card.
 */
const NO_STATS = {
  views_count: 0,
  rating_avg: null,
  rating_count: 0,
  comment_count: 0,
} as const;

/** Public test stream, so playback in mock mode actually plays. */
const TEST_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export function mockManifestUrl(videoId: string): string {
  // Shaped like the real one: opaque, signed, short-lived.
  const expires = Math.floor(Date.now() / 1000) + 3600;
  return `${TEST_HLS}#video=${videoId}&token=mock&expires=${expires}`;
}

export const mockBranding: OrganizationDto = {
  id: 1,
  name: "Evade Films",
  translations: { ru: { tagline: "Смотрите иначе" }, en: { tagline: "Watch differently" } },
  logo: null,
  favicon: null,
  primary_color: "#101113",
  secondary_color: "#17181A",
  accent_color: "#F5F6F6",
  site_url: "",
  support_email: "support@evade.local",
  created_at: "2026-01-12T09:00:00Z",
  updated_at: "2026-06-02T11:30:00Z",
};

function voiceover(id: number, label: string, studio: string | null = null): VoiceoverTrackDto {
  return { id, studio: studio ? id : null, studio_name: studio, language: "ru", label, video_id: null };
}

function subtitle(id: number, language: string, label: string): SubtitleTrackDto {
  return { id, language, label, file: null };
}

interface MockMovie {
  list: MovieListDto;
  detail: MovieDetailDto;
}

function movie(
  id: number,
  input: {
    title: string;
    original: string;
    titleEn?: string;
    description: string;
    descriptionEn?: string;
    short?: string;
    year: number;
    rating: MovieListDto["age_rating"];
    country: string;
    duration: number | null;
    poster: string | null;
    backdrop?: string | null;
    createdAt: string;
    voiceovers?: VoiceoverTrackDto[];
    subtitles?: SubtitleTrackDto[];
  },
): MockMovie {
  const list: MovieListDto = {
    ...NO_STATS,
    id,
    title: input.title,
    original_title: input.original,
    poster: input.poster,
    year: input.year,
    age_rating: input.rating,
    country: input.country,
    duration: input.duration,
    is_published: true,
    created_at: input.createdAt,
  };

  const detail: MovieDetailDto = {
    ...NO_STATS,
    id,
    translations: {
      ru: { title: input.title, description: input.description, short_description: input.short ?? "" },
      en: {
        title: input.titleEn ?? input.original,
        description: input.descriptionEn ?? "",
        short_description: "",
      },
    },
    original_title: input.original,
    poster: input.poster,
    backdrop: input.backdrop ?? null,
    trailer_url: "",
    year: input.year,
    age_rating: input.rating,
    country: input.country,
    duration: input.duration,
    video_id: `mock-movie-${id}`,
    voiceover_tracks: input.voiceovers ?? [voiceover(900 + id, "Дубляж")],
    subtitle_tracks: input.subtitles ?? [],
    is_published: true,
    created_at: input.createdAt,
    updated_at: input.createdAt,
  };

  return { list, detail };
}

export const mockMovies: MockMovie[] = [
  movie(101, {
    title: "Тихий берег",
    original: "The Quiet Shore",
    description:
      "Смотритель маяка находит на камнях чемодан с чужой жизнью внутри. За неделю до шторма он решает, кем станет дальше.",
    descriptionEn:
      "A lighthouse keeper finds a suitcase full of someone else's life. He has a week before the storm to decide whose life he will live.",
    short: "За неделю до шторма он решает, кем станет дальше.",
    year: 2024,
    rating: "16+",
    country: "Россия",
    duration: 118,
    poster: "/mock/poster-1.svg",
    backdrop: "/mock/backdrop-1.svg",
    createdAt: "2026-07-30T12:00:00Z",
    voiceovers: [voiceover(9101, "Дубляж"), voiceover(9102, "Авторский", "Кубик в кубе")],
    subtitles: [subtitle(8101, "ru", "Русские"), subtitle(8102, "en", "English SDH")],
  }),
  movie(102, {
    title: "Полночный экспресс",
    original: "Midnight Express Line",
    description:
      "Ночная электричка идёт по кольцу и никогда не приезжает. Проводница ведёт счёт пассажирам, которых становится меньше.",
    year: 2023,
    rating: "18+",
    country: "Франция",
    duration: 96,
    poster: "/mock/poster-2.svg",
    backdrop: "/mock/backdrop-2.svg",
    createdAt: "2026-07-22T12:00:00Z",
  }),
  movie(103, {
    title: "Северное сияние",
    original: "Aurora",
    description:
      "Метеоролог зимует на станции один и записывает голоса, которых там быть не должно.",
    year: 2021,
    rating: "12+",
    country: "Норвегия",
    duration: 134,
    poster: "/mock/poster-3.svg",
    createdAt: "2026-06-14T12:00:00Z",
  }),
  movie(104, {
    title: "Стеклянный дом",
    original: "House of Glass",
    description:
      "Архитектор строит дом без единой непрозрачной стены и переезжает туда с семьёй.",
    year: 2019,
    rating: "16+",
    country: "Япония",
    duration: 107,
    poster: "/mock/poster-4.svg",
    createdAt: "2026-05-02T12:00:00Z",
  }),
  movie(105, {
    title: "Долгая дорога домой",
    original: "The Long Way Home",
    // No artwork on purpose: the placeholder path has to look right too.
    description: "Дальнобойщик везёт груз, который просил не открывать, и открывает.",
    year: 2018,
    rating: "12+",
    country: "США",
    duration: 142,
    poster: null,
    createdAt: "2026-04-11T12:00:00Z",
  }),
  movie(106, {
    title: "Пепел",
    original: "Ash",
    description: "Документальный портрет города, который каждое лето горит и каждую осень отстраивается.",
    year: 2022,
    rating: "6+",
    country: "Испания",
    duration: null,
    poster: "/mock/poster-5.svg",
    createdAt: "2026-03-19T12:00:00Z",
  }),
  movie(107, {
    title: "Второй состав",
    original: "Second Cast",
    description: "Дублёры провинциального театра играют премьеру, на которую не пришла труппа.",
    year: 2020,
    rating: "0+",
    country: "Россия",
    duration: 89,
    poster: "/mock/poster-6.svg",
    createdAt: "2026-02-08T12:00:00Z",
  }),
];

interface MockSeries {
  list: SeriesListDto;
  detail: SeriesDetailDto;
}

function episode(
  id: number,
  number: number,
  title: string,
  description: string,
  duration: number,
  published = true,
) {
  return {
    id,
    number,
    translations: { ru: { title, description } },
    duration,
    thumbnail: `/mock/still-${(number % 3) + 1}.svg`,
    is_published: published,
    views_count: 0,
  };
}

function series(
  id: number,
  input: {
    title: string;
    original: string;
    description: string;
    short?: string;
    year: number;
    rating: SeriesListDto["age_rating"];
    country: string;
    poster: string | null;
    backdrop?: string | null;
    createdAt: string;
    seasons: SeriesDetailDto["seasons"];
  },
): MockSeries {
  return {
    list: {
      ...NO_STATS,
      id,
      title: input.title,
      original_title: input.original,
      poster: input.poster,
      year: input.year,
      age_rating: input.rating,
      country: input.country,
      season_count: input.seasons.length,
      is_published: true,
      created_at: input.createdAt,
    },
    detail: {
      ...NO_STATS,
      id,
      translations: {
        ru: { title: input.title, description: input.description, short_description: input.short ?? "" },
        en: { title: input.original, description: "", short_description: "" },
      },
      original_title: input.original,
      poster: input.poster,
      backdrop: input.backdrop ?? null,
      trailer_url: "",
      year: input.year,
      age_rating: input.rating,
      country: input.country,
      seasons: input.seasons,
      is_published: true,
      created_at: input.createdAt,
      updated_at: input.createdAt,
    },
  };
}

export const mockSeries: MockSeries[] = [
  series(201, {
    title: "Отлив",
    original: "Ebb",
    description:
      "Посёлок живёт по расписанию воды. Когда отлив однажды не заканчивается, расписание становится единственным, что у людей осталось.",
    short: "Посёлок живёт по расписанию воды.",
    year: 2024,
    rating: "16+",
    country: "Россия",
    poster: "/mock/poster-2.svg",
    backdrop: "/mock/backdrop-3.svg",
    createdAt: "2026-07-28T12:00:00Z",
    seasons: [
      {
        id: 2011,
        number: 1,
        translations: { ru: { title: "Первый сезон" } },
        year: 2024,
        episodes: [
          episode(20111, 1, "Прилив", "Вода уходит на два часа позже обычного, и никто не считает это событием.", 44),
          episode(20112, 2, "Мель", "Рыбаки находят на обнажившемся дне то, что там пролежало сорок лет.", 41),
          episode(20113, 3, "Отлив", "Посёлок собирает совет и голосует за то, чтобы ничего не сообщать наверх.", 42),
          episode(20114, 4, "Дно", "Приезжает комиссия из трёх человек, обратно уезжают двое.", 46),
        ],
      },
      {
        id: 2012,
        number: 2,
        translations: { ru: { title: "Второй сезон" } },
        year: 2025,
        episodes: [
          episode(20121, 1, "Сухо", "Год спустя вода так и не вернулась, а посёлок научился этим торговать.", 45),
          episode(20122, 2, "Соль", "Новый управляющий предлагает жителям контракт на десять лет.", 43),
          // Not yet released: the episode list has to handle drafts.
          episode(20123, 3, "Глубина", "", 44, false),
        ],
      },
    ],
  }),
  series(202, {
    title: "Смена",
    original: "The Shift",
    description: "Ночная бригада реанимации за одно дежурство, снятое одним кадром на серию.",
    year: 2023,
    rating: "18+",
    country: "Великобритания",
    poster: "/mock/poster-3.svg",
    backdrop: "/mock/backdrop-1.svg",
    createdAt: "2026-06-30T12:00:00Z",
    seasons: [
      {
        id: 2021,
        number: 1,
        translations: {},
        year: 2023,
        episodes: [
          episode(20211, 1, "22:00", "Первый вызов принимает стажёр, потому что больше некому.", 52),
          episode(20212, 2, "01:30", "Смена узнаёт, что одна из коек занята коллегой.", 49),
          episode(20213, 3, "05:15", "До конца дежурства сорок минут и один пациент.", 55),
        ],
      },
    ],
  }),
  series(203, {
    title: "Картография",
    original: "Cartography",
    description: "Документальный сериал о людях, которые до сих пор рисуют карты руками.",
    year: 2022,
    rating: "0+",
    country: "Германия",
    poster: null,
    createdAt: "2026-05-18T12:00:00Z",
    seasons: [
      {
        id: 2031,
        number: 1,
        translations: {},
        year: 2022,
        episodes: [
          episode(20311, 1, "Берега", "Как рисуют то, что меняется каждый шторм.", 28),
          episode(20312, 2, "Города", "План города, который перестал совпадать с городом.", 31),
        ],
      },
    ],
  }),
  series(204, {
    title: "Радиомолчание",
    original: "Radio Silence",
    description: "Оператор дальней связи получает ответ на позывной, снятый с эфира в 1991 году.",
    year: 2021,
    rating: "12+",
    country: "Польша",
    poster: "/mock/poster-6.svg",
    createdAt: "2026-04-04T12:00:00Z",
    seasons: [
      {
        id: 2041,
        number: 1,
        translations: {},
        year: 2021,
        episodes: [
          episode(20411, 1, "Позывной", "Ответ приходит через восемь секунд — ровно столько идёт сигнал.", 38),
          episode(20412, 2, "Помехи", "Начальник смены требует объяснить запись, которой нет в журнале.", 40),
          episode(20413, 3, "Тишина", "Оператор выходит в эфир сам.", 43),
        ],
      },
    ],
  }),
];

/** Every voiceover a mock episode can carry. */
export const mockEpisodeVoiceovers = [
  { id: 7001, studio: null, studio_name: null, language: "ru", label: "Дубляж", audio_track_index: 0 },
  { id: 7002, studio: 12, studio_name: "Кубик в кубе", language: "ru", label: "Многоголосый", audio_track_index: 1 },
];
