"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import {
  AGE_RATINGS,
  ANY,
  orderings,
  isFiltered as hasFilters,
  type CatalogFilters,
} from "@/lib/catalog-filters";
import type { AgeRating } from "@/lib/api/types";

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
  const t = useDictionary();

  const filtered = hasFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.ageRating ?? ANY}
        onValueChange={(value) =>
          onChange({ ageRating: value === ANY ? null : (value as AgeRating) })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label={t.catalog.anyRating}>
          <SelectValue placeholder={t.catalog.anyRating} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t.catalog.anyRating}</SelectItem>
          {AGE_RATINGS.map((rating) => (
            <SelectItem key={rating} value={rating}>
              {rating}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.ordering} onValueChange={(ordering) => onChange({ ordering })}>
        <SelectTrigger className="w-[200px]" aria-label={t.catalog.sort}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {orderings(t).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="flex-1" />

      {summary ? <span className="type-overline text-muted-foreground">{summary}</span> : null}

      {filtered && onReset ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          {t.action.reset}
        </Button>
      ) : null}
    </div>
  );
}
