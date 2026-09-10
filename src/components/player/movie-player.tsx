"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SeasonOption } from "evade-player";

import { StateBlock } from "@/components/feedback/state-block";
import { VideoPlayerSurface } from "@/components/player/video-player";
import { useManifestRecovery } from "@/hooks/use-manifest-recovery";
import { usePlaybackTracking } from "@/hooks/use-playback-tracking";
import { catalogService } from "@/lib/api/services/catalog.service";
import { queryKeys } from "@/lib/api/query-keys";
import { useDictionary } from "@/lib/i18n/dictionary-context";
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
 * The player's content selector is driven by the season/episode hierarchy, and
 * a movie has none — so it is handed one synthetic season holding one synthetic
 * episode, which exists only to carry the voiceovers.
 *
 * The value is shared by both levels because nothing ever reads it back: the
 * player matches `currentSeason` and `currentEpisode` against it to find the
 * episode whose voiceovers to list, and that is all it is for.
 */
const MOVIE = "movie";

/** The film's own audio — a manifest requested without a `voiceover_track`. */
const ORIGINAL = "original";

/**
 * Movie playback.
 *
 * Voiceover switching re-requests a signed manifest with `voiceover_track`,
 * because the signature is per-rendition and short-lived. Unlike a series —
 * whose `playback-batch` signs the whole tree at once — a movie has no batch
 * endpoint, so the tracks are offered without a `src` and the chosen one is
 * fetched here.
 */
export function MoviePlayer({
  movieId,
  title,
  poster,
  initialSource,
  audioTracks,
}: MoviePlayerProps) {
  const t = useDictionary();

  const [trackId, setTrackId] = useState<number | null>(null);
  const params = trackId ? { voiceover_track: trackId } : {};

  // Resume point and view counter. Switching the voiceover re-requests a
  // manifest but stays the same movie, so tracking is not keyed by track.
  const { savedState, onSaveState } = usePlaybackTracking("movie", movieId);

  /**
   * The dubs, plus the original the viewer has to be able to get back to.
   *
   * No `src` on any of them: the player would use one directly, but each is a
   * separate signed request, and signing every track up front to fill a menu
   * most viewers never open is worse than signing the one they pick.
   */
  const voiceovers = useMemo(
    () => [
      { label: t.title.noVoiceover, value: ORIGINAL },
      ...audioTracks.map((track) => ({ label: track.label, value: String(track.id) })),
    ],
    [audioTracks, t.title.noVoiceover],
  );

  /**
   * Undefined below one dub, which is what hides the selector: with nothing to
   * choose between, «оригинальная дорожка» is not a choice.
   */
  const seasons: SeasonOption[] | undefined = useMemo(
    () =>
      audioTracks.length > 1
        ? [{ label: title, value: MOVIE, episodes: [{ label: title, value: MOVIE, voiceovers }] }]
        : undefined,
    [audioTracks.length, title, voiceovers],
  );

  const onVoiceoverChange = useCallback(
    (value: string) => setTrackId(value === ORIGINAL ? null : Number(value)),
    [],
  );

  /**
   * The rescue fetch for an expired signature. Deliberately a direct service
   * call: putting it through the query above would change `data`, and the
   * surface below is keyed by the manifest URL — the remount would throw away
   * the position `reload()` is restoring.
   */
  const refresh = useCallback(
    () =>
      catalogService
        // Built here rather than reusing `params`, which is a fresh object
        // every render and would make this callback unstable.
        .getMoviePlayback(movieId, trackId ? { voiceover_track: trackId } : {})
        .then((source) => source.manifestUrl),
    [movieId, trackId],
  );

  const { playerRef, onPlaybackError } = useManifestRecovery({ refresh });

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
    return <StateBlock title={t.empty.playback} hint={t.empty.playbackHint} />;
  }

  const source = data ?? initialSource;
  if (!source) return null;

  return (
    <>
      <VideoPlayerSurface
        key={source.manifestUrl}
        ref={playerRef}
        src={source.manifestUrl}
        poster={poster ?? undefined}
        savedState={savedState}
        onSaveState={onSaveState}
        onPlaybackError={onPlaybackError}
        errorDescription={t.player.linkExpired}
        // Hides the season and episode placeholders the synthetic tree below
        // produces — see the rule of the same name in `video-player.css`.
        className={seasons ? "evade-player-voiceover-only" : undefined}
        seasons={seasons}
        // Both levels are matched against the synthetic value: it is how the
        // player finds the episode whose voiceovers to list. No season or
        // episode handler is passed, but that does not stop those two dropdowns
        // rendering — the web component supplies its own — so they are hidden
        // in CSS instead.
        currentSeason={seasons ? MOVIE : undefined}
        currentEpisode={seasons ? MOVIE : undefined}
        currentVoiceover={seasons ? (trackId === null ? ORIGINAL : String(trackId)) : undefined}
        onVoiceoverChange={seasons ? onVoiceoverChange : undefined}
      />

      <span className="sr-only">{title}</span>
    </>
  );
}
