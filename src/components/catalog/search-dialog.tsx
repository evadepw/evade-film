"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Poster } from "@/components/media/poster";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTitleSearch } from "@/hooks/use-catalog";
import { useDictionary, useRoutes } from "@/lib/i18n/dictionary-context";
import { cardScore, titleMeta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TitleSummary } from "@/lib/domain/models";

/** Enough to recognise the title you meant; the page is one keystroke away. */
const MAX_RESULTS = 5;

/**
 * The header's search: a palette, not a page.
 *
 * Most searches here end in «open that one» — the viewer knows the title and
 * wants the page. That is a lookup, and a lookup should not cost a navigation
 * away from whatever they were reading. So the icon opens a dialog over the
 * page, the first hits arrive as they type, and Enter opens the highlighted
 * one. The full page is still there, at the bottom of the list and on Enter
 * with nothing highlighted, for the searches that are really browsing —
 * filters, kinds, the whole grid.
 *
 * ⌘K / Ctrl-K opens it from anywhere.
 */
export function SearchCommand() {
  const t = useDictionary();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((shown) => !shown);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t.nav.search}
        onClick={() => setOpen(true)}
      >
        <Search strokeWidth={1.5} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/*
          A palette sits high on the page, not centred: the list grows
          downwards, and a centred box would walk up the screen as it fills.
        */}
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[600px]"
        >
          <DialogTitle className="sr-only">{t.catalog.searchTitle}</DialogTitle>
          <DialogDescription className="sr-only">{t.catalog.searchNavHint}</DialogDescription>

          {/* Mounted with the dialog, so every opening starts empty. */}
          <SearchPalette onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchPalette({ onNavigate }: { onNavigate: () => void }) {
  const t = useDictionary();
  const routes = useRoutes();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const trimmed = debounced.trim();
  const hasQuery = trimmed.length >= 2;

  const { data, isFetching } = useTitleSearch(debounced);
  const results: TitleSummary[] = hasQuery ? (data ?? []).slice(0, MAX_RESULTS) : [];

  /**
   * The highlighted row. The list ends with «all results», which is why the
   * count is one past the hits: it is a destination like any other, and the
   * one Enter lands on when nothing matched.
   */
  const [active, setActive] = useState(0);
  const optionCount = results.length + 1;
  const allResultsIndex = results.length;

  // A new query is a new list; keeping the old index would highlight a title
  // that is no longer under the cursor. Reset during the render that brings
  // the new query in rather than in an effect, which would paint the stale
  // highlight first and then correct it.
  const [queryShown, setQueryShown] = useState(trimmed);
  if (queryShown !== trimmed) {
    setQueryShown(trimmed);
    setActive(0);
  }

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const searchPage = routes.search(trimmed || undefined);

  function go(href: string) {
    onNavigate();
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % optionCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + optionCount) % optionCount);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]?.href ?? searchPage);
    }
  }

  return (
    <div>
      {/*
        The field is the whole top of the box — 56px tall, one gutter of 16px,
        no border of its own. A framed input inside a framed dialog is two
        boxes saying the same thing.
      */}
      <div className="flex h-14 items-center gap-3 border-b border-[var(--border-hairline)] px-4">
        <Search
          size={18}
          strokeWidth={1.5}
          className="pointer-events-none shrink-0 text-muted-foreground"
        />
        <input
          role="combobox"
          aria-expanded
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.catalog.searchPlaceholder}
          aria-label={t.catalog.searchTitle}
          aria-controls="search-palette-list"
          aria-activedescendant={`search-palette-option-${active}`}
          autoComplete="off"
          spellCheck={false}
          // The dialog is the focus ring here: the field fills its top edge,
          // so the global one would draw a second box inside the first.
          className="h-full w-full bg-transparent font-sans text-title-3 text-foreground outline-none placeholder:text-[var(--text-disabled)] focus-visible:shadow-none"
        />
      </div>

      {/*
        8px around the list plus 8px inside each row puts every poster on the
        same 16px gutter as the search glyph above it, so the column of artwork
        lines up with the field instead of floating half a step in.
      */}
      <div
        ref={listRef}
        id="search-palette-list"
        role="listbox"
        aria-label={t.catalog.searchTitle}
        className={cn(
          "max-h-[min(58vh,368px)] overflow-y-auto",
          // Nothing typed, nothing to say: the box is a field and a footer
          // until there is something to put between them.
          trimmed && "p-2",
        )}
      >
        {!trimmed ? null : !hasQuery ? (
          <Note>{t.catalog.searchMinChars}</Note>
        ) : isFetching && results.length === 0 ? (
          <ResultSkeletons />
        ) : results.length === 0 ? (
          <Note>{t.empty.search}</Note>
        ) : (
          <div className="flex flex-col gap-0.5">
            {results.map((item, index) => (
              <ResultRow
                key={`${item.kind}-${item.id}`}
                item={item}
                id={`search-palette-option-${index}`}
                active={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] p-2">
        <Link
          href={searchPage}
          id={`search-palette-option-${allResultsIndex}`}
          role="option"
          aria-selected={active === allResultsIndex}
          data-active={active === allResultsIndex}
          onMouseEnter={() => setActive(allResultsIndex)}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-body-sm transition-colors duration-150 ease-evade",
            active === allResultsIndex
              ? "bg-silver-a08 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Search size={15} strokeWidth={1.5} />
          {t.catalog.searchAllResults}
        </Link>

        <span className="hidden pr-2 text-caption text-[var(--text-disabled)] sm:block">
          {t.catalog.searchNavHint}
        </span>
      </div>
    </div>
  );
}

/** The one-line states — nothing typed yet, or nothing matched. */
function Note({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">{children}</p>;
}

function ResultRow({
  item,
  id,
  active,
  onMouseEnter,
  onClick,
}: {
  item: TitleSummary;
  id: string;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const score = cardScore(item);

  return (
    <Link
      href={item.href}
      id={id}
      role="option"
      aria-selected={active}
      data-active={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md p-2 transition-colors duration-150 ease-evade",
        active ? "bg-silver-a08" : "hover:bg-silver-a04",
      )}
    >
      <div className="w-9 shrink-0">
        <Poster src={item.poster} alt="" sizes="36px" className="rounded-xs" rounded={false} />
      </div>

      <div className="min-w-0 flex-1">
        <span className="block truncate text-body leading-tight text-foreground">{item.title}</span>
        <span className="mt-1 block truncate text-caption text-muted-foreground">
          {titleMeta(item)}
        </span>
      </div>

      {score ? (
        <span className="shrink-0 pl-2 font-mono text-caption tabular-nums text-muted-foreground">
          {score}
        </span>
      ) : null}
    </Link>
  );
}

function ResultSkeletons() {
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          <Skeleton className="h-[54px] w-9 rounded-xs" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
