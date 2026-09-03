import Link from "next/link";
import type { ReactNode } from "react";

import { Poster } from "@/components/media/poster";
import { ProgressBar } from "@/components/media/progress-bar";
import { contentMeta, joinMeta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContentRef } from "@/lib/domain/models";

export interface ContentRowProps {
  content: ContentRef;
  /** Overrides the default `S1 · E4` / year line. */
  meta?: string | null;
  /** 0–100. Draws the continue-watching rule under the artwork. */
  progress?: number | null;
  /** Right-hand slot: a score, a status, a timestamp, a button. */
  aside?: ReactNode;
  /** Rendered under the meta line — a comment body, a note. */
  children?: ReactNode;
  className?: string;
}

/**
 * One row of a `/me/` collection.
 *
 * Ratings, watchlist entries, history and the viewer's own comments are four
 * lists of the same thing — a content card with something attached — so they
 * share one row instead of four near-identical layouts.
 */
export function ContentRow({
  content,
  meta,
  progress,
  aside,
  children,
  className,
}: ContentRowProps) {
  return (
    <div
      className={cn(
        "flex gap-4 border-b border-[var(--border-hairline)] py-4 last:border-b-0",
        className,
      )}
    >
      <Link href={content.href} className="w-[72px] shrink-0 rounded-lg md:w-[92px]">
        <Poster src={content.poster} alt={content.title} ratio="poster" sizes="92px" />
        {typeof progress === "number" && progress > 0 ? (
          <ProgressBar value={progress} label={content.title} className="mt-1.5" />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <Link
          href={content.href}
          className="text-body-sm font-semibold transition-colors duration-150 ease-evade hover:text-muted-foreground"
        >
          {content.title}
        </Link>
        <span className="text-caption text-muted-foreground">
          {meta ?? joinMeta([contentMeta(content)])}
        </span>
        {children}
      </div>

      {aside ? <div className="flex shrink-0 items-start gap-3 pt-0.5">{aside}</div> : null}
    </div>
  );
}
