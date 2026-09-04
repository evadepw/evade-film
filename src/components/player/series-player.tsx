"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SeasonOption } from "evade-player";

import { StateBlock } from "@/components/feedback/state-block";
import { VideoPlayerSurface } from "@/components/player/video-player";
import { useManifestRecovery } from "@/hooks/use-manifest-recovery";
import { usePlaybackTracking } from "@/hooks/use-playback-tracking";
import { catalogService } from "@/lib/api/services/catalog.service";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import type { Season, SeriesPlayback } from "@/lib/domain/models";

export interface SeriesPlayerProps {
  seriesId: number;
  /** Catalogue metadata — supplies episode titles the playback batch does not carry. */
  seasons: Season[];
  playback: SeriesPlayback;
  poster?: string | null;
  initialSeason?: number;
  initialEpisode?: number;
}

const seasonValue = (season: number) => `s${season}`;
const episodeValue = (season: number, episode: number) => `s${season}e${episode}`;

/**
 * Series playback.
 *
 * The whole season/episode/voiceover tree — with a signed manifest on every
 * leaf — comes from one `playback-batch` call, so the player's own content
 * selector can switch episodes without a network round trip. The selection is
 * mirrored into the URL so a chosen episode is linkable and survives reload.
 */
export function SeriesPlayer({
  seriesId,
  seasons,
  playback,
  poster,
  initialSeason,
  initialEpisode,
}: SeriesPlayerProps) {
  const t = useDictionary();

  const router = useRouter();
  const pathname = usePathname();

  /**
   * Progress is stored per episode, so the selector's `s1e2` value has to be
   * resolvable back to an episode id. The playback batch is the only place
   * both live side by side.
   */
  const episodeIds = useMemo(() => {
    const map = new Map<string, number>();
    for (const season of playback.seasons) {
      for (const episode of season.episodes) {
        map.set(episodeValue(season.number, episode.number), episode.episodeId);
      }
    }
    return map;
  }, [playback]);

  const episodeTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const season of seasons) {
      for (const episode of season.episodes) {
        map.set(episodeValue(season.number, episode.number), episode.title);
      }
    }
    return map;
  }, [seasons]);

  /** Only episodes with a ready manifest are offered; the rest are not playable yet. */
  const options: SeasonOption[] = useMemo(
    () =>
      playback.seasons
        .map((season) => ({
          label: t.title.seasonN(season.number),
          value: seasonValue(season.number),
          episodes: season.episodes
            .filter((episode) => Boolean(episode.manifestUrl))
            .map((episode) => {
              const value = episodeValue(season.number, episode.number);
              const title = episodeTitles.get(value);
              return {
                label: title ? `${episode.number}. ${title}` : t.title.episodeN(episode.number),
                value,
                src: episode.manifestUrl ?? undefined,
                voiceovers: episode.voiceovers
                  .filter((voiceover) => Boolean(voiceover.manifestUrl))
                  .map((voiceover) => ({
                    label: voiceover.label,
                    value: String(voiceover.id),
                    src: voiceover.manifestUrl ?? undefined,
                  })),
              };
            }),
        }))
        .filter((season) => season.episodes.length > 0),
    [playback, episodeTitles, t.title],
  );

  const firstSeason = options[0];
  const firstEpisode = firstSeason?.episodes?.[0];

  const requested =
    initialSeason && initialEpisode ? episodeValue(initialSeason, initialEpisode) : undefined;
  const requestedExists = options.some((season) =>
    season.episodes?.some((episode) => episode.value === requested),
  );

  const [current, setCurrent] = useState(() =>
    requested && requestedExists ? requested : (firstEpisode?.value ?? ""),
  );
  const [voiceover, setVoiceover] = useState<string | undefined>(undefined);

  const syncUrl = useCallback(
    (episode: string) => {
      const match = /^s(\d+)e(\d+)$/.exec(episode);
      if (!match) return;
      const query = new URLSearchParams({ season: match[1], episode: match[2] });
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [pathname, router],
  );

  const handleEpisodeChange = useCallback(
    (value: string) => {
      setCurrent(value);
      setVoiceover(undefined);
      syncUrl(value);
    },
    [syncUrl],
  );

  const handleSeasonChange = useCallback(
    (value: string) => {
      const season = options.find((option) => option.value === value);
      const first = season?.episodes?.[0];
      if (first) handleEpisodeChange(first.value);
    },
    [options, handleEpisodeChange],
  );

  // `usePlaybackTracking` is keyed by the episode being played, so switching
  // episodes reads that episode's resume point and counts its own view. The
  // series gets one view per session alongside it.
  const currentEpisodeId = episodeIds.get(current) ?? 0;
  const { savedState, onSaveState } = usePlaybackTracking("episode", currentEpisodeId, {
    alsoCountViewFor: { type: "series", id: seriesId },
  });

  /**
   * One `playback-batch` signed the whole tree at once, so when a signature
   * lapses every URL in `options` is stale — including the one on screen.
   * Re-signing just the episode being watched is the cheap half of that:
   * `getEpisodePlayback` exists for exactly this, and the rest of the tree is
   * re-signed anyway the next time the page loads.
   */
  const refresh = useCallback(async () => {
    const match = /^s(\d+)e(\d+)$/.exec(current);
    if (!match) return null;

    const source = await catalogService.getEpisodePlayback(seriesId, {
      season: Number(match[1]),
      episode: Number(match[2]),
      ...(voiceover ? { voiceover_track: Number(voiceover) } : {}),
    });
    return source.manifestUrl;
  }, [seriesId, current, voiceover]);

  const { playerRef, onPlaybackError } = useManifestRecovery({ refresh });

  const src = useMemo(() => {
    for (const season of options) {
      for (const episode of season.episodes ?? []) {
        if (episode.value !== current) continue;
        const selected = episode.voiceovers?.find((track) => track.value === voiceover);
        return selected?.src ?? episode.src;
      }
    }
    return undefined;
  }, [options, current, voiceover]);

  if (!src) {
    return <StateBlock title={t.empty.playback} hint={t.empty.playbackHint} />;
  }

  const currentSeason = current.split("e")[0];

  return (
    <VideoPlayerSurface
      key={`${seriesId}-${current}-${voiceover ?? "default"}`}
      ref={playerRef}
      src={src}
      poster={poster ?? undefined}
      seasons={options}
      currentSeason={currentSeason}
      currentEpisode={current}
      currentVoiceover={voiceover}
      savedState={currentEpisodeId ? savedState : undefined}
      onSaveState={onSaveState}
      onSeasonChange={handleSeasonChange}
      onEpisodeChange={handleEpisodeChange}
      onVoiceoverChange={setVoiceover}
      onPlaybackError={onPlaybackError}
      errorDescription={t.player.linkExpired}
    />
  );
}
