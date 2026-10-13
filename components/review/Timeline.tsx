"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { formatTime } from "@/lib/youtube";
import type { Profile } from "@/lib/types";

export const JATHI_COLORS = ["#f3d9d9", "#f6ebc4", "#e3e9d6", "#dde6f0", "#eadcf0", "#f4e0cc"];

export type TimelineComment = { id: string; t_sec: number; body: string; author: Profile };
export type TimelineSpan = { jathi_id: string; name: string; start: number; end: number; color: string };

const AVATAR = 22;
const LANES = 3;
/** how long a comment stays popped up after the playhead passes it */
const POP_SECONDS = 3.5;

export function Timeline({
  duration,
  time,
  playing,
  spans,
  comments,
  activeJathi,
  onSeek,
  onJathiClick,
}: {
  duration: number;
  time: number;
  playing: boolean;
  spans: TimelineSpan[];
  comments: TimelineComment[];
  activeJathi: string | null;
  onSeek: (t: number) => void;
  onJathiClick: (jathiId: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragT, setDragT] = useState<number | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const d = duration || 1;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / d) * 100))}%`;

  // Stack avatars that would overlap into a few lanes (SoundCloud-style bunching).
  const placed = useMemo(() => {
    const sorted = [...comments].sort((a, b) => a.t_sec - b.t_sec);
    const laneEnds: number[] = Array(LANES).fill(-Infinity);
    return sorted.map((c) => {
      const x = width ? (c.t_sec / d) * width : 0;
      let lane = laneEnds.findIndex((end) => x - end >= AVATAR * 0.8);
      if (lane === -1) lane = laneEnds.indexOf(Math.min(...laneEnds));
      laneEnds[lane] = x;
      return { ...c, lane };
    });
  }, [comments, width, d]);

  const shownTime = dragT ?? time;
  const popped = new Set(
    playing ? comments.filter((c) => c.t_sec <= time && time < c.t_sec + POP_SECONDS).map((c) => c.id) : [],
  );
  if (hovered) popped.add(hovered);

  function timeFromPointer(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * d;
  }

  return (
    <div className="select-none">
      {/* comment avatars + popped bubbles */}
      <div className="relative" style={{ height: AVATAR * 0.6 * (LANES - 1) + AVATAR + 4 }}>
        {placed.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSeek(c.t_sec)}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered((h) => (h === c.id ? null : h))}
            className="absolute -translate-x-1/2 transition-transform hover:scale-125"
            style={{
              left: pct(c.t_sec),
              bottom: c.lane * AVATAR * 0.6,
              zIndex: popped.has(c.id) ? 30 : 10 + LANES - c.lane,
            }}
            aria-label={`${c.author.display_name} at ${formatTime(c.t_sec)}`}
          >
            <Avatar profile={c.author} size={AVATAR} />
          </button>
        ))}
        {placed
          .filter((c) => popped.has(c.id))
          .slice(-2)
          .map((c) => {
            const frac = c.t_sec / d;
            return (
              <div
                key={c.id}
                className="pointer-events-none absolute z-40 w-64 rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-lg"
                style={{
                  left: pct(c.t_sec),
                  bottom: c.lane * AVATAR * 0.6 + AVATAR + 6,
                  // keep bubbles on screen at the ends of the bar
                  transform: `translateX(${frac < 0.2 ? "-10%" : frac > 0.8 ? "-90%" : "-50%"})`,
                }}
              >
                <span className="font-medium" style={{ color: c.author.color }}>
                  {c.author.display_name}
                </span>{" "}
                <span className="text-xs text-muted">{formatTime(c.t_sec)}</span>
                <p className="line-clamp-3">{c.body}</p>
              </div>
            );
          })}
      </div>

      {/* scrub track */}
      <div
        ref={trackRef}
        className="relative h-3 cursor-pointer rounded-full bg-line"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragT(timeFromPointer(e.clientX));
        }}
        onPointerMove={(e) => dragT !== null && setDragT(timeFromPointer(e.clientX))}
        onPointerUp={(e) => {
          onSeek(timeFromPointer(e.clientX));
          setDragT(null);
        }}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-maroon" style={{ width: pct(shownTime) }} />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-maroon shadow"
          style={{ left: pct(shownTime) }}
        />
      </div>

      {/* jathi bands */}
      <div className="relative mt-1.5 h-7">
        {spans.map((s) => (
          <button
            key={s.jathi_id}
            type="button"
            onClick={() => onJathiClick(s.jathi_id)}
            title={`${s.name} · ${formatTime(s.start)}–${formatTime(s.end)}`}
            className={`absolute inset-y-0 overflow-hidden whitespace-nowrap border-r border-white px-1.5 text-left text-xs leading-7 transition-opacity ${
              activeJathi && activeJathi !== s.jathi_id ? "opacity-40" : ""
            } ${activeJathi === s.jathi_id ? "ring-2 ring-inset ring-maroon" : ""}`}
            style={{ left: pct(s.start), width: `calc(${pct(s.end)} - ${pct(s.start)})`, background: s.color }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mt-1 flex justify-between font-mono text-xs text-muted">
        <span>{formatTime(shownTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
