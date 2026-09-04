import type { RatingSummary } from "@/lib/domain/models";

/**
 * The summary a vote produces, derived locally.
 *
 * Worth computing by hand rather than waiting for the response: one press moves
 * the average, the vote count *and* the histogram bar, and a round trip's
 * silence in between reads as the control having ignored the click.
 *
 * Lives here rather than in the hook because it is the part that can be wrong
 * without anything failing loudly, and a pure module is the part a test can
 * reach without a React Query client behind it.
 */
export function applyVote(summary: RatingSummary, value: number | null): RatingSummary {
  const previous = summary.myRating;
  if (previous === value) return summary;

  const count = summary.count + (previous === null ? 1 : 0) - (value === null ? 1 : 0);
  const total = (summary.average ?? 0) * summary.count - (previous ?? 0) + (value ?? 0);

  const distribution = [...summary.distribution];
  if (previous !== null && distribution[previous] !== undefined) distribution[previous] -= 1;
  if (value !== null && distribution[value] !== undefined) distribution[value] += 1;

  return {
    average: count > 0 ? total / count : null,
    count,
    distribution,
    myRating: value,
  };
}
