import { Skeleton } from "@/components/ui/skeleton";

/**
 * The account collections.
 *
 * `AccountLayout` stays mounted around this — a segment's `loading.tsx` renders
 * inside its own layout — so the heading and the sub-nav are already on screen
 * and only the list below them is missing. The shape is `ListShell`'s own
 * loading state, so the page does not change twice on the way in.
 */
export default function Loading() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline gap-x-4 border-b border-[var(--border-hairline)] pb-4">
        <Skeleton className="h-6 w-40" />
        <span className="flex-1" />
        <Skeleton className="h-3 w-8" />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[110px] w-full rounded-lg" />
        ))}
      </div>
    </section>
  );
}
