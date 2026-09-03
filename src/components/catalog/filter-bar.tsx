"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { dictionary } from "@/lib/i18n/dictionary";
import type { AgeRating } from "@/lib/api/types";

export const AGE_RATINGS: AgeRating[] = ["0+", "6+", "12+", "16+", "18+"];

export const ORDERINGS = [
  { value: "-created_at", label: dictionary.catalog.sortNew },
  { value: "created_at", label: dictionary.catalog.sortOld },
  { value: "title", label: dictionary.catalog.sortAz },
  { value: "-year", label: dictionary.catalog.sortYear },
] as const;

export const ANY = "any";

export interface CatalogFilters {
  ageRating: AgeRating | null;
  ordering: string;
}

export interface FilterBarProps {
  filters: CatalogFilters;
  onChange: (next: Partial<CatalogFilters>) => void;
  onReset?: () => void;
  /** Count line: «Найдено 24». Rendered as an overline. */
  summary?: string;
}

/**
 * Catalogue filters. Two controls and a reset — the system's density rule is
 * "air is the brand", so a filter panel is not a place to add more chrome.
 */
export function FilterBar({ filters, onChange, onReset, summary }: FilterBarProps) {
  const isFiltered = filters.ageRating !== null || filters.ordering !== ORDERINGS[0].value;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.ageRating ?? ANY}
        onValueChange={(value) =>
          onChange({ ageRating: value === ANY ? null : (value as AgeRating) })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label={dictionary.catalog.anyRating}>
          <SelectValue placeholder={dictionary.catalog.anyRating} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{dictionary.catalog.anyRating}</SelectItem>
          {AGE_RATINGS.map((rating) => (
            <SelectItem key={rating} value={rating}>
              {rating}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.ordering} onValueChange={(ordering) => onChange({ ordering })}>
        <SelectTrigger className="w-[200px]" aria-label={dictionary.catalog.sort}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDERINGS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="flex-1" />

      {summary ? <span className="type-overline text-muted-foreground">{summary}</span> : null}

      {isFiltered && onReset ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          {dictionary.action.reset}
        </Button>
      ) : null}
    </div>
  );
}
