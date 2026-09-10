import { PageSection } from "@/components/layout/page-section";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders for the catalogue.
 *
 * These live apart from the components they stand in for, and reach for nothing
 * heavier than `Skeleton` and the page shell, on purpose: a `loading.tsx`
 * fallback whose module graph contains `next/image` never resolves — the
 * segment renders on the server and then sits on its fallback forever. Keep
 * this file's imports leaf-like.
 *
 * The page-level shapes below exist because `loading.tsx` is inherited: a
 * fallback placed on a segment stands in for every route beneath it, so each
 * segment whose shape differs from its parent's needs its own.
 */

export function TitleCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      <Skeleton className="mt-3 h-3.5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

export function TitleGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {Array.from({ length: count }, (_, index) => (
        <TitleCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TitleRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      <Skeleton className="mb-5 h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="w-[148px] shrink-0 md:w-[196px]">
            <TitleCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The overline-and-title block of `PageHeading`, hairline included. */
function PageHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-hairline)] pb-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64 md:h-11" />
    </div>
  );
}

/**
 * The catalogue listing: heading, the two filter selects, then the grid — the
 * shape `/movies` and `/series` settle into.
 *
 * `filters` is off for a collection's page, which is the same listing without
 * the filter row: a fallback that draws controls the page never grows leaves
 * the grid jumping up by a row the moment the real thing arrives.
 */
export function CatalogPageSkeleton({ filters = true }: { filters?: boolean }) {
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeadingSkeleton />
        <div className="flex flex-col gap-8">
          {filters ? (
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-[180px] rounded-lg" />
              <Skeleton className="h-8 w-[200px] rounded-lg" />
            </div>
          ) : null}
          <TitleGridSkeleton />
        </div>
      </div>
    </PageSection>
  );
}

/** One 16:9 shelf tile, as `CollectionCard` draws it. */
export function CollectionCardSkeleton() {
  return <Skeleton className="aspect-video w-full rounded-lg" />;
}

/** The shelf index: the same heading, then wider cells than the title grid. */
export function CollectionsPageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeadingSkeleton />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-5 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {Array.from({ length: count }, (_, index) => (
            <CollectionCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </PageSection>
  );
}

/**
 * Search: the same heading as the catalogue, then the full-width field, the
 * three kind tags, and a shorter grid — `/search` opens with eight rows of
 * results, not twelve.
 */
export function SearchPageSkeleton() {
  return (
    <PageSection className="py-14 pb-24">
      <div className="flex flex-col gap-10">
        <PageHeadingSkeleton />
        <div className="flex flex-col gap-8">
          <Skeleton className="h-13 w-full rounded-lg" />
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <TitleGridSkeleton count={8} />
        </div>
      </div>
    </PageSection>
  );
}

/**
 * The title page: the 21:9 still, the poster overlapping it, and the band of
 * facts underneath. The negative margins have to match `TitleDetailView` or the
 * poster jumps up the page the moment the real thing arrives.
 */
export function TitleDetailSkeleton() {
  return (
    <div className="flex flex-col gap-14 pb-24">
      <div>
        <Skeleton className="h-[280px] w-full rounded-none md:h-[420px]" />

        <PageSection className="relative -mt-24 md:-mt-[140px]">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:gap-10">
            <div className="w-[150px] shrink-0 md:w-[220px]">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            </div>

            <div className="flex flex-1 flex-col gap-4 pb-2">
              <Skeleton className="h-8 w-3/4 max-w-md md:h-11" />
              <Skeleton className="h-4 w-56" />
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-13 w-36 rounded-lg" />
                <Skeleton className="h-13 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </PageSection>
      </div>

      <PageSection>
        <Skeleton className="mb-8 h-6 w-40" />

        <div className="flex flex-col gap-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full max-w-(--max-prose)" />
              <Skeleton className="h-4 w-11/12 max-w-(--max-prose)" />
              <Skeleton className="h-4 w-2/3 max-w-(--max-prose)" />
            </div>
            <Skeleton className="h-44 w-full rounded-lg" />
          </div>

          <dl className="grid grid-cols-2 gap-x-10 gap-y-6 border-t border-[var(--border-hairline)] pt-8 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-3.5 w-28" />
              </div>
            ))}
          </dl>
        </div>
      </PageSection>

      <PageSection>
        <TitleRailSkeleton />
      </PageSection>
    </div>
  );
}

/**
 * The player routes: the back link, the 16:9 frame, and the two columns of
 * detail under it. Sits on the deep surface the watch pages use, so the
 * fallback does not flash a lighter page behind the player.
 */
export function WatchPageSkeleton() {
  return (
    <div className="bg-[var(--surface-page-deep)] pb-24">
      <PageSection className="pt-6">
        <Skeleton className="mb-5 h-8 w-28" />
        <Skeleton className="aspect-video w-full rounded-lg" />

        <div className="mt-8 grid gap-14 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3 max-w-sm" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-(--max-prose)" />
            <Skeleton className="h-4 w-4/5 max-w-(--max-prose)" />
          </div>

          <dl className="flex flex-col gap-4 border-t border-[var(--border-hairline)] pt-5 md:border-t-0 md:pt-0">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1.5 h-3.5 w-32" />
              </div>
            ))}
          </dl>
        </div>
      </PageSection>
    </div>
  );
}

/**
 * A single episode: the still on the left, its facts on the right — the
 * `/series/[id]/episodes/[episodeId]` shape, which is neither the series page
 * nor the player.
 */
export function EpisodePageSkeleton() {
  return (
    <PageSection className="py-10 pb-24">
      <div className="mx-auto flex w-full max-w-(--container-content) flex-col gap-10">
        <Skeleton className="h-3.5 w-40" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
          <Skeleton className="aspect-video w-full rounded-lg" />

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-7 w-3/4 max-w-sm" />
            <Skeleton className="h-4 w-full max-w-(--max-prose)" />
            <Skeleton className="h-4 w-5/6 max-w-(--max-prose)" />
            <Skeleton className="h-13 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    </PageSection>
  );
}
