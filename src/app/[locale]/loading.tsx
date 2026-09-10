import { PageSection } from "@/components/layout/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { TitleRailSkeleton } from "@/components/catalog/skeletons";

/**
 * The home page's shape — hero, then rails.
 *
 * This sits on the `[locale]` segment, so it stands in for any route beneath it
 * that has no `loading.tsx` of its own. Every child segment now carries one, so
 * in practice this is the home page's fallback and nothing else — but a new
 * segment added next to them inherits this shape until it brings its own.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-14 pb-24">
      {/* The hero's own height, or the page jumps the moment it arrives. */}
      <Skeleton className="h-[560px] w-full rounded-none md:h-[660px] lg:h-[min(78vh,780px)]" />
      <PageSection className="flex flex-col gap-14">
        <TitleRailSkeleton />
        <TitleRailSkeleton />
      </PageSection>
    </div>
  );
}
