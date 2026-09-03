"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tag } from "@/components/ui/tag";
import { TitleGrid } from "@/components/catalog/title-grid";
import { TitleGridSkeleton } from "@/components/catalog/skeletons";
import { StateBlock } from "@/components/feedback/state-block";
import { SectionHeader } from "@/components/layout/section-header";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCatalogBrowse, useTitleSearch } from "@/hooks/use-catalog";
import { dictionary } from "@/lib/i18n/dictionary";
import type { TitleKind } from "@/lib/domain/models";

type KindFilter = "all" | TitleKind;

const KIND_FILTERS: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: dictionary.action.all },
  { value: "movie", label: dictionary.nav.movies },
  { value: "series", label: dictionary.nav.series },
];

/**
 * Search across both kinds.
 *
 * The query lives in the URL so a search is shareable; typing is debounced and
 * the previous result set stays on screen while the next one loads, which keeps
 * the grid from flashing on every keystroke.
 */
export function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [kind, setKind] = useState<KindFilter>("all");
  const debounced = useDebouncedValue(query);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debounced.trim()) params.set("q", debounced.trim());
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  }, [debounced, pathname, router]);

  const hasQuery = debounced.trim().length >= 2;

  const search = useTitleSearch(debounced);
  const browse = useCatalogBrowse();
  const { data, isFetching, isError } = hasQuery ? search : browse;

  const items = useMemo(
    () => (data ?? []).filter((item) => kind === "all" || item.kind === kind),
    [data, kind],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="relative max-w-[560px]">
        <Search
          size={20}
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          inputSize="lg"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={dictionary.catalog.searchPlaceholder}
          aria-label={dictionary.catalog.searchTitle}
          className="pl-12"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {KIND_FILTERS.map((filter) => (
          <Tag
            key={filter.value}
            selected={kind === filter.value}
            onClick={() => setKind(filter.value)}
          >
            {filter.label}
          </Tag>
        ))}
        <span className="flex-1" />
        {data ? (
          <span className="type-overline text-muted-foreground">
            {hasQuery
              ? dictionary.catalog.found(items.length)
              : dictionary.catalog.titles(items.length)}
          </span>
        ) : null}
      </div>

      {isError ? (
        <StateBlock title={dictionary.error.offline} hint={dictionary.error.offlineHint} />
      ) : isFetching && !data ? (
        <TitleGridSkeleton count={8} />
      ) : items.length === 0 ? (
        <StateBlock title={dictionary.empty.search} hint={dictionary.empty.searchHint} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* No query yet: the page browses instead of waiting. */}
          {!hasQuery ? (
            <SectionHeader
              overline={dictionary.home.inCatalog}
              title={dictionary.home.allTitles}
            />
          ) : null}
          <TitleGrid items={items} className={isFetching ? "opacity-60" : undefined} />
        </div>
      )}
    </div>
  );
}
