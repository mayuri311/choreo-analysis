"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal slice of the YouTube IFrame API we use.
type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

export type PlayerControls = {
  seek(t: number): void;
  play(): void;
  pause(): void;
};

/**
 * Mounts a YouTube player into `containerRef` and reports playback time ~5x/sec.
 * The YouTube API has no time-update event, so we poll.
 */
export function useYouTubePlayer(youtubeId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const mount = document.createElement("div");
    containerRef.current?.appendChild(mount);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            setReady(true);
            setDuration(playerRef.current?.getDuration() ?? 0);
            poll = setInterval(() => {
              const p = playerRef.current;
              if (!p) return;
              setTime(p.getCurrentTime());
              const d = p.getDuration();
              if (d) setDuration(d);
            }, 200);
          },
          onStateChange: (e) => setPlaying(e.data === YT.PlayerState.PLAYING),
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      playerRef.current?.destroy();
      playerRef.current = null;
      mount.remove();
    };
  }, [youtubeId]);

  const seek = useCallback((t: number) => {
    playerRef.current?.seekTo(Math.max(0, t), true);
    setTime(Math.max(0, t));
  }, []);
  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  /** exact time right now (the polled `time` can be up to 200ms behind) */
  const getTime = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, []);

  return { containerRef, ready, time, duration, playing, seek, play, pause, getTime };
}
