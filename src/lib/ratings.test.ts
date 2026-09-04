import { describe, expect, it } from "vitest";

import { applyVote } from "@/lib/ratings";
import type { RatingSummary } from "@/lib/domain/models";

function summary(overrides: Partial<RatingSummary> = {}): RatingSummary {
  return {
    average: 7,
    count: 2,
    // Two voters, both on 7.
    distribution: Array.from({ length: 11 }, (_, score) => (score === 7 ? 2 : 0)),
    myRating: null,
    ...overrides,
  };
}

describe("applyVote", () => {
  it("adds a first vote to the average, the count and the histogram", () => {
    const next = applyVote(summary(), 9);

    expect(next.count).toBe(3);
    expect(next.average).toBeCloseTo((7 * 2 + 9) / 3, 6);
    expect(next.distribution[9]).toBe(1);
    expect(next.myRating).toBe(9);
  });

  it("moves a vote without changing the count", () => {
    const next = applyVote(applyVote(summary(), 9), 5);

    expect(next.count).toBe(3);
    expect(next.average).toBeCloseTo((7 * 2 + 5) / 3, 6);
    expect(next.distribution[9]).toBe(0);
    expect(next.distribution[5]).toBe(1);
  });

  it("withdraws a vote", () => {
    const next = applyVote(applyVote(summary(), 9), null);

    expect(next.count).toBe(2);
    expect(next.average).toBeCloseTo(7, 6);
    expect(next.distribution[9]).toBe(0);
    expect(next.myRating).toBeNull();
  });

  it("reports no average once the last vote is withdrawn", () => {
    const only = summary({
      average: 8,
      count: 1,
      distribution: Array.from({ length: 11 }, (_, score) => (score === 8 ? 1 : 0)),
      myRating: 8,
    });

    const next = applyVote(only, null);

    expect(next.count).toBe(0);
    expect(next.average).toBeNull();
  });

  it("is a no-op when the score has not changed", () => {
    const rated = applyVote(summary(), 9);
    // Identity, not just equality: React bails out of the re-render on it.
    expect(applyVote(rated, 9)).toBe(rated);
  });

  it("does not mutate what it was given", () => {
    const before = summary();
    applyVote(before, 9);

    expect(before.myRating).toBeNull();
    expect(before.count).toBe(2);
    expect(before.distribution[9]).toBe(0);
  });
});
