import { PageSection } from "@/components/layout/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { TitleRailSkeleton } from "@/components/catalog/skeletons";

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
