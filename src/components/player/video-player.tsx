"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type {
  EvadePlayerElement,
  PlaybackErrorDetail,
  PlaybackState,
  ReloadOptions,
  SeasonOption,
} from "evade-player";

import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/feedback/state-block";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { cn } from "@/lib/utils";

import "./video-player.css";

const SCRIPT_SRC = "/vendor/evade-player/evade-player.js";
const STYLE_HREF = "/vendor/evade-player/evade-player.css";
const TAG = "evade-player";

/** A bundle that arrives but never registers the element is broken, not slow. */
const DEFINE_TIMEOUT_MS = 15_000;

type LoadStatus = "loading" | "ready" | "failed";

/**
 * Loads the vendored player bundle, once per document.
 *
 * `customElements.whenDefined` never rejects and never times out, so on its own
 * a bundle that 404s left the surface below stuck waiting: an empty rectangle,
 * no message, nothing to retry. The bundle is copied into `public/` by
 * `postinstall`, so a deploy that skips lifecycle scripts produces exactly that.
 * The script's own `error` event is the signal that was missing.
 */
let pending: Promise<void> | null = null;

function loadPlayer(): Promise<void> {
  if (pending) return pending;

  pending = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${STYLE_HREF}"]`)) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = STYLE_HREF;
      document.head.append(style);
    }

    // An earlier mount already registered it.
    if (customElements.get(TAG)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener(
      "error",
      () => {
        // Removed so a retry fetches the file again instead of waiting on a
        // tag that has already failed and will never fire another event.
        script.remove();
        reject(new Error(`Failed to load ${SCRIPT_SRC}`));
      },
      { once: true },
    );
    document.head.append(script);

    const timer = setTimeout(
      () => reject(new Error(`${TAG} was not defined within ${DEFINE_TIMEOUT_MS}ms`)),
      DEFINE_TIMEOUT_MS,
    );

    void customElements.whenDefined(TAG).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });

  // A failure must not be remembered — the retry button re-runs this.
  pending.catch(() => {
    pending = null;
  });

  return pending;
}

/** What the player saves, plus the length it has since learned from the media. */
export interface PlaybackProgress extends PlaybackState {
  /** Seconds, or null before the manifest is parsed. */
  duration: number | null;
}

/**
 * What a parent can do to a mounted player. Only the imperative bits belong
 * here — everything declarative stays a prop.
 */
export interface PlayerHandle {
  /**
   * Swap the source in place, keeping position, voiceover, quality and volume.
   * The URL must differ from the current one or the engine is left untouched.
   */
  reload(src: string, options?: ReloadOptions): void;
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
  /**
   * Every playback failure, recovered ones included — check `fatal` first. A
   * fatal `401`/`403` is an expired signature, which the caller answers by
   * fetching a fresh manifest and handing it to `reload()`.
   */
  onPlaybackError?: (error: PlaybackErrorDetail) => void;
  onSeasonChange?: (value: string) => void;
  onEpisodeChange?: (value: string) => void;
  onVoiceoverChange?: (value: string) => void;
  className?: string;
  ref?: Ref<PlayerHandle>;
}

type ChangeEvent = CustomEvent<{ value: string }>;
type SaveStateEvent = CustomEvent<{ state: PlaybackState }>;
// Unlike the others, this event's detail *is* the payload rather than a wrapper.
type PlaybackErrorEvent = CustomEvent<PlaybackErrorDetail>;

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
  onPlaybackError,
  onSeasonChange,
  onEpisodeChange,
  onVoiceoverChange,
  className,
  ref,
}: EvadePlayerProps) {
  const t = useDictionary();

  const elementRef = useRef<EvadePlayerElement>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  /** Bumped by the retry button to re-run the loader. */
  const [attempt, setAttempt] = useState(0);

  // The element is rendered only once its class is registered — assigning
  // properties to a not-yet-upgraded element would be shadowed by the custom
  // element's own class fields.
  useEffect(() => {
    let cancelled = false;

    loadPlayer().then(
      () => {
        if (!cancelled) setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("failed");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const defined = status === "ready";

  /**
   * A recovery puts a URL on the element that the `src` prop does not know
   * about. Both refs exist to keep the property sync below from handing the
   * expired one back on the next unrelated re-render.
   */
  const recoveredSrc = useRef<string | null>(null);
  const lastSrcProp = useRef<string | undefined>(undefined);

  /**
   * `reload` is the recovery path for an expired signature: it swaps the source
   * without recreating the element, so the chosen voiceover, quality, volume
   * and fullscreen all survive. Remounting instead — which is what a changed
   * React `key` does — loses every one of them.
   */
  useImperativeHandle(
    ref,
    () => ({
      reload: (nextSrc, options) => {
        recoveredSrc.current = nextSrc;
        elementRef.current?.reload(nextSrc, options);
      },
    }),
    // `elementRef` is stable, so the handle never needs rebuilding.
    [],
  );

  // Resetting the status here rather than at the top of the effect above: a
  // synchronous setState in an effect body just queues a second render pass.
  const retry = () => {
    setStatus("loading");
    setAttempt((count) => count + 1);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // A changed prop is the caller deciding what plays, which supersedes
    // whatever a recovery swapped in.
    if (lastSrcProp.current !== src) {
      lastSrcProp.current = src;
      recoveredSrc.current = null;
    }

    element.src = recoveredSrc.current ?? src;
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
    const element = elementRef.current;
    if (!element) return;

    const handlers: Array<[string, (event: Event) => void]> = [
      ["seasonchange", (event) => onSeasonChange?.((event as ChangeEvent).detail.value)],
      ["episodechange", (event) => onEpisodeChange?.((event as ChangeEvent).detail.value)],
      ["voiceoverchange", (event) => onVoiceoverChange?.((event as ChangeEvent).detail.value)],
      [
        "playbackerror",
        (event) => onPlaybackError?.((event as PlaybackErrorEvent).detail),
      ],
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
  }, [defined, onSeasonChange, onEpisodeChange, onVoiceoverChange, onSaveState, onPlaybackError]);

  if (status === "failed") {
    return (
      <StateBlock
        title={t.player.unavailable}
        hint={t.player.unavailableHint}
        action={
          <Button variant="secondary" onClick={retry}>
            {t.action.retry}
          </Button>
        }
      />
    );
  }

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
      {defined ? <evade-player ref={elementRef} /> : null}
    </div>
  );
}
