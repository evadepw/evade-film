import { CatalogPageSkeleton } from "@/components/catalog/skeletons";

/**
 * A collection's own page settles into the catalogue's shape — heading, then a
 * grid of posters — minus the filter row, which it has no need for.
 */
export default function Loading() {
  return <CatalogPageSkeleton filters={false} />;
}
