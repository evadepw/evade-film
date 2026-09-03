"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StateBlock } from "@/components/feedback/state-block";
import { VideoPlayerSurface } from "@/components/player/video-player";
import { usePlaybackTracking } from "@/hooks/use-playback-tracking";
import { catalogService } from "@/lib/api/services/catalog.service";
import { queryKeys } from "@/lib/api/query-keys";
import { dictionary } from "@/lib/i18n/dictionary";
import type { AudioTrack, PlaybackSource } from "@/lib/domain/models";

export interface MoviePlayerProps {
  movieId: number;
  title: string;
  poster?: string | null;
  /** Resolved on the server so the first frame does not wait on a round trip. */
  initialSource: PlaybackSource | null;
  audioTracks: AudioTrack[];
}

/**
 * Movie playback.
 *
 * A movie has no season/episode hierarchy, so the player's content selector
 * stays out of the way and voiceover switching happens here: picking a track
 * re-requests a signed manifest with `voiceover_track`, because the signature
 * is per-rendition and short-lived.
 */
export function MoviePlayer({
  movieId,
  title,
  poster,
  initialSource,
  audioTracks,
}: MoviePlayerProps) {
  const [trackId, setTrackId] = useState<number | null>(null);
  const params = trackId ? { voiceover_track: trackId } : {};

  // Resume point and view counter. Switching the voiceover re-requests a
  // manifest but stays the same movie, so tracking is not keyed by track.
  const { savedState, onSaveState } = usePlaybackTracking("movie", movieId);

  const { data, isError } = useQuery({
    queryKey: queryKeys.movies.playback(movieId, params),
    queryFn: () => catalogService.getMoviePlayback(movieId, params),
    initialData: trackId === null ? (initialSource ?? undefined) : undefined,
    // Manifest URLs carry `token`/`expires`; never serve one from a warm cache.
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  if (isError || (!data && !initialSource)) {
    return <StateBlock title={dictionary.empty.playback} hint={dictionary.empty.playbackHint} />;
  }

  const source = data ?? initialSource;
  if (!source) return null;

  return (
    <div className="flex flex-col gap-5">
      <VideoPlayerSurface
        key={source.manifestUrl}
        src={source.manifestUrl}
        poster={poster ?? undefined}
        savedState={savedState}
        onSaveState={onSaveState}
        errorDescription={dictionary.player.linkExpired}
      />

      {audioTracks.length > 1 ? (
        <div className="flex items-center gap-3">
          <span className="type-label text-muted-foreground">{dictionary.player.voiceover}</span>
          <Select
            value={trackId === null ? "original" : String(trackId)}
            onValueChange={(value) => setTrackId(value === "original" ? null : Number(value))}
          >
            <SelectTrigger className="w-[240px]" aria-label={dictionary.player.voiceover}>
              <SelectValue placeholder={dictionary.title.noVoiceover} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">{dictionary.title.noVoiceover}</SelectItem>
              {audioTracks.map((track) => (
                <SelectItem key={track.id} value={String(track.id)}>
                  {track.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <span className="sr-only">{title}</span>
    </div>
  );
}
