import Link from "next/link";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Poster, type PosterRatio } from "@/components/media/poster";
import { ProgressBar } from "@/components/media/progress-bar";
import { cn } from "@/lib/utils";

export interface PosterCardProps {
  href: string;
  title: string;
  meta?: string | null;
  poster?: string | null;
  ratio?: PosterRatio;
  /** Corner marker: age rating, `4K`, `НОВИНКА`. */
  badge?: string | null;
  /**
   * Average score, top-right. The catalog denormalises it onto every title, so
   * a grid can show it without a request per tile — and it is the one number
   * people scan a wall of posters for.
   */
  score?: string | null;
  /** 0–100. Renders the continue-watching rule. */
  progress?: number | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * The catalogue tile. On hover it lifts 4px, fades in a flat scrim and a glass
 * play circle — the one hover treatment the system defines for artwork.
 */
export function PosterCard({
  href,
  title,
  meta,
  poster,
  ratio = "poster",
  badge,
  score,
  progress,
  sizes,
  priority,
  className,
}: PosterCardProps) {
  return (
    <Link
      href={href}
      className={cn("group/card block rounded-lg focus-visible:outline-none", className)}
    >
      <div className="relative transition-transform duration-200 ease-evade group-hover/card:-translate-y-1">
        <Poster src={poster} alt={title} ratio={ratio} sizes={sizes} priority={priority} />

        {badge ? (
          <span className="absolute top-2.5 left-2.5">
            <Badge variant="glass">{badge}</Badge>
          </span>
        ) : null}

        {score ? (
          <span className="absolute top-2.5 right-2.5">
            <Badge variant="glass" className="font-mono tabular-nums">
              {score}
            </Badge>
          </span>
        ) : null}

        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--scrim-flat)]",
            "opacity-0 transition-opacity duration-200 ease-evade group-hover/card:opacity-100",
          )}
        >
          <span
            className={cn(
              "surface-glass flex size-12 items-center justify-center rounded-full border border-border text-foreground",
              "scale-90 transition-transform duration-200 ease-evade group-hover/card:scale-100",
            )}
          >
            <Play size={20} strokeWidth={1.5} />
          </span>
        </span>

        {typeof progress === "number" && progress > 0 ? (
          <span className="absolute right-2.5 bottom-2.5 left-2.5">
            <ProgressBar value={progress} label={title} />
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="truncate text-body-sm font-semibold text-foreground">{title}</div>
        {meta ? <div className="mt-1 truncate text-caption text-muted-foreground">{meta}</div> : null}
      </div>
    </Link>
  );
}
