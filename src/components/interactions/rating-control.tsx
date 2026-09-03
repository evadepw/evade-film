"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { useRating } from "@/hooks/use-interactions";
import { ApiError } from "@/lib/api/errors";
import { dictionary } from "@/lib/i18n/dictionary";
import { formatCount, formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContentType, RatingSummary } from "@/lib/domain/models";

export interface RatingControlProps {
  type: ContentType;
  id: number;
  /** Adds the vote histogram over the scale. Off where the block has to stay short. */
  showDistribution?: boolean;
  /**
   * The average and vote count the page was rendered with. Draws immediately;
   * the request that follows fills in the histogram and the viewer's own score.
   */
  initial?: RatingSummary;
  className?: string;
}

const SCALE = Array.from({ length: 11 }, (_, score) => score);

/**
 * The 0–10 scale the backend actually stores — not a five-star widget with the
 * ends thrown away.
 *
 * Eleven fixed-width buttons wrapped at any container narrower than ~410px, so
 * the scale is one **grid** instead: eleven equal columns that divide whatever
 * width they are given. It cannot wrap, and it keeps the same column geometry
 * down to a phone.
 *
 * The histogram sits on those same eleven columns, above the track. That is the
 * reason to share a grid rather than a flex row: each bar stands over the score
 * it belongs to, and the digits under it label both, so the numbers 0–10 are
 * printed once instead of twice.
 *
 * Pressing the score you already hold clears the rating — the same toggle the
 * API implements (`PUT` the value you hold ≡ `DELETE`). Anonymous visitors see
 * the average and the histogram; only `my_rating` needs a session.
 */
export function RatingControl({
  type,
  id,
  showDistribution = true,
  initial,
  className,
}: RatingControlProps) {
  const { summary, isLoading, canRate, isSaving, setRating } = useRating(type, id, initial);
  const [hovered, setHovered] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-lg" />;
  if (!summary) return null;

  const myRating = summary.myRating;
  const active = hovered ?? myRating;
  const peak = Math.max(1, ...summary.distribution);

  async function handleRate(score: number) {
    if (!canRate) {
      setAuthOpen(true);
      return;
    }
    try {
      await setRating(score);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : dictionary.error.title);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="type-label text-[var(--text-disabled)]">{dictionary.rating.title}</span>
          <span className="font-display text-display-3 leading-none font-light">
            {formatRating(summary.average) ?? "—"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-0.5 pb-1 text-caption text-muted-foreground">
          <span>
            {summary.count > 0 ? dictionary.rating.votes(summary.count) : dictionary.rating.none}
          </span>
          {/*
           * While the pointer is on the scale this line previews the score under
           * it, so the digit being chosen is legible even where the segment is
           * only 28px wide.
           */}
          {active !== null ? (
            <span className="text-foreground">
              {hovered !== null && hovered !== myRating
                ? `${dictionary.rating.rate}: ${hovered}`
                : `${dictionary.rating.yours}: ${myRating}`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {showDistribution && summary.count > 0 ? (
          <div className="grid grid-cols-11 items-end gap-px" aria-hidden>
            {summary.distribution.map((votes, score) => (
              <span
                key={score}
                title={`${score}: ${formatCount(votes)}`}
                className={cn(
                  "w-full rounded-t-xs transition-colors duration-150 ease-evade",
                  active !== null && score <= active ? "bg-silver-a40" : "bg-silver-a12",
                )}
                style={{ height: `${Math.max(2, (votes / peak) * 36)}px` }}
              />
            ))}
          </div>
        ) : null}

        {/*
         * One track, not eleven buttons: the gap-px over a hairline background
         * draws the dividers, so the control reads as a single object and the
         * system keeps its rule about lines rather than plates.
         */}
        <div
          role="group"
          aria-label={dictionary.rating.rate}
          onMouseLeave={() => setHovered(null)}
          className="grid grid-cols-11 gap-px overflow-hidden rounded-sm bg-[var(--border-hairline)]"
        >
          {SCALE.map((score) => {
            const filled = active !== null && score <= active;

            return (
              <button
                key={score}
                type="button"
                disabled={isSaving}
                onMouseEnter={() => setHovered(score)}
                onFocus={() => setHovered(score)}
                onBlur={() => setHovered(null)}
                onClick={() => void handleRate(score)}
                aria-label={dictionary.rating.scoreOf(score)}
                aria-pressed={myRating === score}
                className={cn(
                  "flex h-9 items-center justify-center font-mono text-caption tabular-nums",
                  "transition-colors duration-150 ease-evade outline-none disabled:opacity-40",
                  "focus-visible:relative focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]",
                  filled
                    ? "bg-silver-1 text-[var(--text-inverse)]"
                    : "bg-[var(--surface-card)] text-muted-foreground hover:bg-silver-a08 hover:text-foreground",
                  myRating === score && "font-semibold",
                )}
              >
                {score}
              </button>
            );
          })}
        </div>
      </div>

      {myRating !== null ? (
        <button
          type="button"
          onClick={() => void handleRate(myRating)}
          className="self-start text-caption text-muted-foreground underline-offset-4 transition-colors duration-150 ease-evade hover:text-foreground hover:underline"
        >
          {dictionary.rating.clear}
        </button>
      ) : null}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
