import { PageSection } from "@/components/layout/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { TitleRailSkeleton } from "@/components/catalog/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-14 pb-24">
      <Skeleton className="h-[440px] w-full rounded-none md:h-[520px]" />
      <PageSection className="flex flex-col gap-14">
        <TitleRailSkeleton />
        <TitleRailSkeleton />
      </PageSection>
    </div>
  );
}
