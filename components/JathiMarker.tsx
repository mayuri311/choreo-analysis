"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useYouTubePlayer } from "@/components/review/useYouTubePlayer";
import { JATHI_COLORS } from "@/components/review/Timeline";
import { createClient } from "@/lib/supabase/client";
import { formatTime, parseTime } from "@/lib/youtube";
import type { Jathi, JathiMark, Profile, Song, Video } from "@/lib/types";

export function JathiMarker({
  video,
  songs,
  jathis,
  marks: initialMarks,
  profiles,
  participantIds,
}: {
  video: Video;
  songs: Song[];
  jathis: Jathi[];
  marks: JathiMark[];
  profiles: Profile[];
  participantIds: string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { containerRef, ready, time, seek } = useYouTubePlayer(video.youtube_id);
  const [starts, setStarts] = useState<Record<string, number | undefined>>(
    Object.fromEntries(initialMarks.map((m) => [m.jathi_id, m.start_sec])),
  );
  const [participants, setParticipants] = useState(new Set(participantIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextUnmarked = jathis.find((j) => starts[j.id] === undefined);

  async function setSong(songId: string) {
    const { error } = await supabase.from("videos").update({ song_id: songId || null }).eq("id", video.id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setError(null);
    const rows = jathis
      .filter((j) => starts[j.id] !== undefined)
      .map((j) => ({ video_id: video.id, jathi_id: j.id, start_sec: starts[j.id]! }));
    const cleared = jathis.filter((j) => starts[j.id] === undefined).map((j) => j.id);

    const ops: PromiseLike<{ error: { message: string } | null }>[] = [
      supabase.from("video_jathi_marks").upsert(rows),
    ];
    if (cleared.length) {
      ops.push(supabase.from("video_jathi_marks").delete().eq("video_id", video.id).in("jathi_id", cleared));
    }
    if (video.kind === "practice") {
      const removed = participantIds.filter((id) => !participants.has(id));
      const added = [...participants].filter((id) => !participantIds.includes(id));
      if (added.length) {
        ops.push(supabase.from("video_participants").insert(added.map((user_id) => ({ video_id: video.id, user_id }))));
      }
      if (removed.length) {
        ops.push(supabase.from("video_participants").delete().eq("video_id", video.id).in("user_id", removed));
      }
    }
    const results = await Promise.all(ops);
    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) return setError(failed.error.message);
    router.push(`/videos/${video.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Set up: {video.title}</h1>
        <div
          ref={containerRef}
          className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full"
        />
        <p className="text-sm text-muted">
          Play the video and press the button as each jathi starts. Use the ±0.5s buttons to fine-tune.
          Current time: <span className="font-mono text-ink">{formatTime(time)}</span>
        </p>
        {nextUnmarked && (
          <button
            type="button"
            disabled={!ready}
            onClick={() => setStarts((s) => ({ ...s, [nextUnmarked.id]: Math.round(time * 10) / 10 }))}
            className="w-full rounded-lg bg-maroon px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            Mark start of “{nextUnmarked.name}” at {formatTime(time)}
          </button>
        )}
      </div>

      <aside className="space-y-6">
        <section>
          <label className="block text-sm font-semibold">Song</label>
          <select
            value={video.song_id ?? ""}
            onChange={(e) => setSong(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
          >
            <option value="">— none —</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          {video.song_id && jathis.length === 0 && (
            <p className="mt-1 text-xs text-muted">This song has no jathis yet. A captain can add them on the Team page.</p>
          )}
        </section>

        {jathis.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold">Jathis</h2>
            <ol className="mt-2 space-y-1">
              {jathis.map((j, i) => {
                const t = starts[j.id];
                return (
                  <li key={j.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-sm">
                    <span className="h-3 w-3 rounded-sm" style={{ background: JATHI_COLORS[i % JATHI_COLORS.length] }} />
                    <span className="flex-1 truncate">{j.name}</span>
                    {t === undefined ? (
                      <span className="text-xs text-muted">not marked</span>
                    ) : (
                      <>
                        <button type="button" className="px-1 text-xs text-muted hover:text-ink"
                          onClick={() => setStarts((s) => ({ ...s, [j.id]: Math.max(0, t - 0.5) }))}>−.5</button>
                        <input
                          key={t}
                          defaultValue={formatTime(t) + (t % 1 ? `.${Math.round((t % 1) * 10)}` : "")}
                          onBlur={(e) => {
                            const v = parseTime(e.target.value);
                            if (v !== null) setStarts((s) => ({ ...s, [j.id]: v }));
                          }}
                          className="w-16 rounded border border-line px-1 font-mono text-xs"
                        />
                        <button type="button" className="px-1 text-xs text-muted hover:text-ink"
                          onClick={() => setStarts((s) => ({ ...s, [j.id]: t + 0.5 }))}>+.5</button>
                        <button type="button" className="px-1 text-xs text-maroon hover:underline"
                          onClick={() => seek(t)}>go</button>
                        <button type="button" className="px-1 text-xs text-muted hover:text-red-700"
                          onClick={() => setStarts((s) => ({ ...s, [j.id]: undefined }))}>✕</button>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {video.kind === "practice" && (
          <section>
            <h2 className="text-sm font-semibold">Who&apos;s in this video</h2>
            <p className="text-xs text-muted">They&apos;ll see it on their dashboard and can be tagged.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profiles.map((p) => {
                const on = participants.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setParticipants((cur) => {
                        const next = new Set(cur);
                        if (on) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      })
                    }
                    className="rounded-full border px-2 py-0.5 text-xs"
                    style={on ? { background: p.color, borderColor: p.color, color: "white" } : { borderColor: "#e8e1d8" }}
                  >
                    {p.display_name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & open review"}
          </button>
          <Link href={`/videos/${video.id}`} className="text-sm text-muted hover:text-ink">Cancel</Link>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </aside>
    </div>
  );
}
