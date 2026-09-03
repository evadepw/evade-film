"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaybackState, SeasonOption } from "evade-player";

import { cn } from "@/lib/utils";

import "./video-player.css";

const SCRIPT_SRC = "/vendor/evade-player/evade-player.js";
const STYLE_HREF = "/vendor/evade-player/evade-player.css";
const TAG = "evade-player";

/** What the player saves, plus the length it has since learned from the media. */
export interface PlaybackProgress extends PlaybackState {
  /** Seconds, or null before the manifest is parsed. */
  duration: number | null;
}

export interface EvadePlayerProps {
  /** HLS master manifest, or a progressive source. */
  src: string;
  poster?: string;
  locale?: string;
  errorDescription?: string;
  seasons?: SeasonOption[];
  currentSeason?: string;
  currentEpisode?: string;
  currentVoiceover?: string;
  /**
   * The resume point. `undefined` leaves the player on its own `localStorage`
   * memory (the right answer for a signed-out visitor), `null` disables the
   * resume prompt, and a state opens it at that position.
   */
  savedState?: PlaybackState | null;
  /** Fires every few seconds while playing, on pause, and before unload. */
  onSaveState?: (progress: PlaybackProgress) => void;
  onSeasonChange?: (value: string) => void;
  onEpisodeChange?: (value: string) => void;
  onVoiceoverChange?: (value: string) => void;
  className?: string;
}

interface EvadePlayerElement extends HTMLElement {
  src?: string;
  poster?: string;
  locale?: string;
  errorDescription?: string;
  seasons?: SeasonOption[];
  currentSeason?: string;
  currentEpisode?: string;
  currentVoiceover?: string;
  savedState?: PlaybackState | null;
}

type ChangeEvent = CustomEvent<{ value: string }>;
type SaveStateEvent = CustomEvent<{ state: PlaybackState }>;

/**
 * EvadePlayer, mounted as its `<evade-player>` Web Component.
 *
 * Why the Web Component and not the package's React export: that entry inlines
 * react-dom behind a `require()` interop shim which Turbopack refuses to
 * execute. The standalone build has none, but the package does not publish it
 * in `exports` — so it is vendored into `public/` at install time (see
 * `scripts/vendor-player.mjs`) and loaded here as a plain script. That also
 * keeps ~900 kB of player out of the app bundle: only watch routes fetch it.
 *
 * Complex values are assigned as element *properties* (a JS property always
 * wins over the JSON attribute), and the player's custom events are forwarded
 * to ordinary React callbacks.
 */
export function VideoPlayerSurface({
  src,
  poster,
  locale = "ru",
  errorDescription,
  seasons,
  currentSeason,
  currentEpisode,
  currentVoiceover,
  savedState,
  onSaveState,
  onSeasonChange,
  onEpisodeChange,
  onVoiceoverChange,
  className,
}: EvadePlayerProps) {
  const ref = useRef<EvadePlayerElement>(null);
  const [defined, setDefined] = useState(false);

  // Load the player bundle once per document, then render the element only
  // after its class is registered — assigning properties to a not-yet-upgraded
  // element would be shadowed by the custom element's own class fields.
  useEffect(() => {
    let cancelled = false;

    if (!document.querySelector(`link[href="${STYLE_HREF}"]`)) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = STYLE_HREF;
      document.head.append(style);
    }

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.append(script);
    }

    customElements.whenDefined(TAG).then(() => {
      if (!cancelled) setDefined(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.src = src;
    element.poster = poster;
    element.locale = locale;
    element.errorDescription = errorDescription;
    element.seasons = seasons;
    element.currentSeason = currentSeason;
    element.currentEpisode = currentEpisode;
    element.currentVoiceover = currentVoiceover;
    // Assigned only when the caller has an opinion: leaving the property alone
    // is what keeps the player's own localStorage resume working for guests.
    if (savedState !== undefined) element.savedState = savedState;
  }, [
    defined,
    src,
    poster,
    locale,
    errorDescription,
    seasons,
    currentSeason,
    currentEpisode,
    currentVoiceover,
    savedState,
  ]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handlers: Array<[string, (event: Event) => void]> = [
      ["seasonchange", (event) => onSeasonChange?.((event as ChangeEvent).detail.value)],
      ["episodechange", (event) => onEpisodeChange?.((event as ChangeEvent).detail.value)],
      ["voiceoverchange", (event) => onVoiceoverChange?.((event as ChangeEvent).detail.value)],
      [
        "savestate",
        (event) => {
          // The player reports a position but not a length. The length is what
          // turns a position into progress server-side, so it is read off the
          // media element the player rendered — the one place it exists.
          const media = element.querySelector("video");
          const duration =
            media && Number.isFinite(media.duration) && media.duration > 0 ? media.duration : null;
          onSaveState?.({ ...(event as SaveStateEvent).detail.state, duration });
        },
      ],
    ];

    for (const [name, handler] of handlers) element.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of handlers) element.removeEventListener(name, handler);
    };
  }, [defined, onSeasonChange, onEpisodeChange, onVoiceoverChange, onSaveState]);

  return (
    <div
      className={cn(
        // 16:9, but never taller than the viewport minus the header and the
        // title block — the transport bar has to stay reachable without
        // scrolling. The max-width keeps the ratio while the height is capped.
        "evade-player-surface mx-auto aspect-video w-full",
        "max-h-[calc(100svh-14rem)] max-w-[calc((100svh-14rem)*16/9)]",
        className,
      )}
    >
      {defined ? <evade-player ref={ref} /> : null}
    </div>
  );
}
