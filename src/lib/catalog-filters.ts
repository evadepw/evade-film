import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import type { AgeRating, CatalogListParams } from "@/lib/api/types";

/**
 * The catalogue's filter vocabulary, kept free of components.
 *
 * Both halves of the listing read it now: the server resolves page one from the
 * request's query string, and the browser resolves the same filters from
 * `useSearchParams`. Sharing the parser is what guarantees the two agree — a
 * disagreement would show the viewer one grid and then swap it for another on
 * hydration.
 */

export const AGE_RATINGS: AgeRating[] = ["0+", "6+", "12+", "16+", "18+"];

/** Sort options, labelled. The values are the API's; only the labels translate. */
export const orderings = (t: Dictionary) =>
  [
    { value: "-created_at", label: t.catalog.sortNew },
    { value: "created_at", label: t.catalog.sortOld },
    { value: "title", label: t.catalog.sortAz },
    { value: "-year", label: t.catalog.sortYear },
  ] as const;

/** The values alone — for validating a query string, where copy is irrelevant. */
export const ORDERING_VALUES: readonly string[] = orderings(getDictionary(DEFAULT_LOCALE)).map(
  (option) => option.value,
);

export const DEFAULT_ORDERING = ORDERING_VALUES[0];

/** The «любой» option in the rating select — Radix forbids an empty value. */
export const ANY = "any";

export interface CatalogFilters {
  ageRating: AgeRating | null;
  ordering: string;
}

/** Reads filters out of anything that answers `get` — `URLSearchParams` or Next's. */
export function parseFilters(params: { get(key: string): string | null }): CatalogFilters {
  const age = params.get("age");
  const sort = params.get("sort");

  return {
    // Unknown values fall back rather than reaching the API: the query string
    // is viewer input, and the backend answers 400 to a rating it does not know.
    ageRating: AGE_RATINGS.includes(age as AgeRating) ? (age as AgeRating) : null,
    ordering: ORDERING_VALUES.includes(sort ?? "") ? (sort as string) : DEFAULT_ORDERING,
  };
}

/** Reads them out of the plain object a server component is handed. */
export function parseFiltersFromSearchParams(
  search: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const first = (key: string) => {
    const value = search[key];
    return (Array.isArray(value) ? value[0] : value) ?? null;
  };

  return parseFilters({ get: first });
}

export function toListParams(filters: CatalogFilters): CatalogListParams {
  return { ordering: filters.ordering, age_rating: filters.ageRating ?? undefined };
}

export function isFiltered(filters: CatalogFilters): boolean {
  return filters.ageRating !== null || filters.ordering !== DEFAULT_ORDERING;
}
