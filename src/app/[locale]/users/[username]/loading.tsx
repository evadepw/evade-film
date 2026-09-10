import { PageSection } from "@/components/layout/page-section";
import { Skeleton } from "@/components/ui/skeleton";

/** Someone else's card: the avatar, the name, the handle — and the rule under them. */
export default function Loading() {
  return (
    <PageSection className="pt-16 pb-24">
      <div className="flex items-center gap-6 border-b border-[var(--border-hairline)] pb-10">
        <Skeleton className="size-20 shrink-0 rounded-full" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </PageSection>
  );
}
