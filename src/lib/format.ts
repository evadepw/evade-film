import type { TitleSummary } from "@/lib/domain/models";

/**
 * Formatting rules from the design system's content fundamentals:
 * metadata is joined with middots (never commas or pipes), durations read
 * `118 мин`, timecodes are mono, and a real minus is used for remaining time.
 */

export const MIDDOT = " · ";

export function joinMeta(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((part): part is string | number => part !== null && part !== undefined && part !== "")
    .map(String)
    .join(MIDDOT);
}

/** `118 мин` for anything under two hours, `2 ч 18 мин` above. */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 120) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** `40:10` / `1:17:50` — mono, for player timecodes. */
export function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The one-line metadata under a card or title: `2024 · Драма · 118 мин`. */
export function titleMeta(title: TitleSummary): string {
  return joinMeta([
    title.year,
    title.country,
    title.kind === "movie"
      ? formatDuration(title.duration)
      : title.seasonCount
        ? `${title.seasonCount} сезон${seasonSuffix(title.seasonCount)}`
        : null,
  ]);
}

/**
 * The score for a card corner. Null below one vote: a «10,0» standing on a
 * single rating says less than nothing, and the catalog hands out the average
 * from the first vote onwards.
 */
export function cardScore(title: { rating: number | null; ratingCount: number }): string | null {
  if (title.rating === null || title.ratingCount < 1) return null;
  return formatRating(title.rating);
}

function seasonSuffix(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "а";
  return "ов";
}

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** `12 июня 2026` — profile dates, «в закладках с». */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" });

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * `2 часа назад`. Comments and history rows are read relative to now — an exact
 * timestamp there is precision nobody asked for. Anything older than a year
 * falls back to the date, where the absolute value starts to matter again.
 */
export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const seconds = (date.getTime() - Date.now()) / 1000;
  const magnitude = Math.abs(seconds);

  if (magnitude >= 365 * 24 * 3600) return formatDate(iso);
  if (magnitude < 60) return "только что";

  for (const [unit, size] of RELATIVE_STEPS) {
    if (magnitude >= size) return RELATIVE_FORMAT.format(Math.round(seconds / size), unit);
  }
  return "только что";
}

/** `1.2 тыс`, `18` — vote and view counts, where the exact number is noise. */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} тыс`;
  return `${(value / 1_000_000).toFixed(1)} млн`;
}

/** A rating printed the way the catalogue shows it: one decimal, never `7.0`. */
export function formatRating(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toFixed(1).replace(".", ",");
}

/**
 * The line under a card built from a `ContentRef` — the shape `/me/` lists
 * return. An episode reads `S1 · E4`; a film or a series falls back to its year.
 */
export function contentMeta(content: {
  type: "movie" | "series" | "episode";
  year: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
}): string {
  if (content.type === "episode") {
    return joinMeta([
      content.seasonNumber ? `S${content.seasonNumber}` : null,
      content.episodeNumber ? `E${content.episodeNumber}` : null,
    ]);
  }
  return joinMeta([content.year]);
}

/** `осталось 24 мин` — the one place the design system asks for a real minus. */
export function formatRemaining(
  positionSeconds: number,
  durationSeconds: number | null,
): string | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  const left = Math.round((durationSeconds - positionSeconds) / 60);
  return left > 0 ? `осталось ${left} мин` : null;
}
