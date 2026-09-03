"use client";

import { useCallback, useMemo, useRef } from "react";
import type { PlaybackState } from "evade-player";

import { useViewCounter, useWatchProgress } from "@/hooks/use-interactions";
import type { ResumableType } from "@/lib/api/services/interactions.service";
import type { PlaybackProgress } from "@/components/player/video-player";
import type { ContentType } from "@/lib/domain/models";

export interface PlaybackTracking {
  /**
   * Handed to the player as its resume point. `undefined` means «not our
   * business» — a signed-out visitor keeps the player's own localStorage
   * memory, which is better than no resume at all.
   */
  savedState: PlaybackState | null | undefined;
  onSaveState: (progress: PlaybackProgress) => void;
}

/**
 * Ties the player's save timer to the two endpoints that care about it:
 * `PUT …/progress/` for the resume point and `POST …/view/` for the counter.
 *
 * The player already saves every five seconds while playing, on pause and
 * before unload, so nothing here schedules anything — it forwards what the
 * player decided to save. A ping that fails is swallowed: the next one carries
 * a later position anyway.
 *
 * The view is counted on the first save rather than on mount, because that is
 * the first moment the video is demonstrably playing. The backend deduplicates
 * per visitor per day, so the extra calls after a reload cost nothing.
 */
export function usePlaybackTracking(
  type: ResumableType,
  id: number,
  options: { alsoCountViewFor?: { type: ContentType; id: number } } = {},
): PlaybackTracking {
  const { entry, isTracking, save } = useWatchProgress(type, id);
  const countView = useViewCounter(type, id);

  const companion = options.alsoCountViewFor;
  const countCompanionView = useViewCounter(companion?.type ?? "series", companion?.id ?? 0);

  /** Which content the view has already been counted for, this mount. */
  const counted = useRef<number | null>(null);

  const savedState = useMemo<PlaybackState | null | undefined>(() => {
    if (!isTracking) return undefined;
    // `null` while the resume point is still loading: an unwanted prompt from
    // stale localStorage is worse than one that appears a beat late.
    if (!entry || entry.positionSeconds < 1) return null;
    return { time: entry.positionSeconds };
  }, [isTracking, entry]);

  const onSaveState = useCallback(
    (progress: PlaybackProgress) => {
      if (counted.current !== id) {
        counted.current = id;
        countView();
        if (companion) countCompanionView();
      }
      void save(progress.time, progress.duration);
    },
    [id, countView, companion, countCompanionView, save],
  );

  return { savedState, onSaveState };
}
