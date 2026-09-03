import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders for the catalogue.
 *
 * These live apart from the components they stand in for, and import nothing
 * beyond `Skeleton`, on purpose: a `loading.tsx` fallback that reaches into a
 * module graph containing `next/image` never resolves — the segment renders on
 * the server and then sits on its fallback forever. Keep this file leaf-like.
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
