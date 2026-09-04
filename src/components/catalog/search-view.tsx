"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useDictionary } from "@/lib/i18n/dictionary-context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { TitleKind } from "@/lib/domain/models";

type KindFilter = "all" | TitleKind;

function parseKind(raw: string | null): KindFilter {
  return raw === "movie" || raw === "series" ? raw : "all";
}

const kindFilters = (t: Dictionary): Array<{ value: KindFilter; label: string }> => [
  { value: "all", label: t.action.all },
  { value: "movie", label: t.nav.movies },
  { value: "series", label: t.nav.series },
];

/**
 * Search across both kinds.
 *
 * The query *and* the kind filter live in the URL, so a search is shareable
 * whole and the browser's Back button walks it. Typing is debounced and the
 * previous result set stays on screen while the next one loads, which keeps the
 * grid from flashing on every keystroke.
 */
export function SearchView() {
  const t = useDictionary();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const kind = parseKind(searchParams.get("kind"));

  const [query, setQuery] = useState(urlQuery);
  const debounced = useDebouncedValue(query);

  /**
   * Rewrites one parameter and leaves the rest of the query string alone —
   * building a fresh `URLSearchParams` here used to drop every other param.
   */
  const replaceParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /**
   * The last `q` this component put in the URL. It tells the two effects below
   * apart: a change that matches it is our own write echoing back, anything
   * else is the viewer navigating (Back, Forward, a pasted link).
   */
  const ownQuery = useRef(urlQuery);

  // Input → URL, once typing settles.
  useEffect(() => {
    const next = debounced.trim();
    if (next === ownQuery.current) return;
    ownQuery.current = next;
    replaceParam("q", next);
  }, [debounced, replaceParam]);

  // URL → input, so Back does not leave a stale string in the field.
  useEffect(() => {
    if (urlQuery === ownQuery.current) return;
    ownQuery.current = urlQuery;
    setQuery(urlQuery);
  }, [urlQuery]);

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
      {/*
        Full width, so the field's edges land on the same column as the rule
        above it and the grid below. Boxed to 560px it floated in the middle of
        the page, attached to nothing.
      */}
      <div className="relative">
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
          placeholder={t.catalog.searchPlaceholder}
          aria-label={t.catalog.searchTitle}
          className="pl-12"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {kindFilters(t).map((filter) => (
          <Tag
            key={filter.value}
            selected={kind === filter.value}
            onClick={() => replaceParam("kind", filter.value === "all" ? "" : filter.value)}
          >
            {filter.label}
          </Tag>
        ))}
        <span className="flex-1" />
        {data ? (
          <span className="type-overline text-muted-foreground">
            {hasQuery
              ? t.catalog.found(items.length)
              : t.catalog.titles(items.length)}
          </span>
        ) : null}
      </div>

      {isError ? (
        <StateBlock title={t.error.offline} hint={t.error.offlineHint} />
      ) : isFetching && !data ? (
        <TitleGridSkeleton count={8} />
      ) : items.length === 0 ? (
        <StateBlock title={t.empty.search} hint={t.empty.searchHint} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* No query yet: the page browses instead of waiting. */}
          {!hasQuery ? (
            <SectionHeader
              overline={t.home.inCatalog}
              title={t.home.allTitles}
            />
          ) : null}
          <TitleGrid items={items} className={isFetching ? "opacity-60" : undefined} />
        </div>
      )}
    </div>
  );
}
