"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { formatTime, parseTime } from "@/lib/youtube";
import type { Profile } from "@/lib/types";

export function CommentComposer({
  me,
  time,
  taggable,
  allowTags,
  onFocus,
  onSubmit,
}: {
  me: Profile;
  time: number;
  /** people who can be tagged (video participants) */
  taggable: Profile[];
  allowTags: boolean;
  /** called when the user starts writing: pauses the player and returns the exact time */
  onFocus: () => number;
  onSubmit: (c: { t_sec: number; body: string; tags: string[] }) => Promise<string | null>;
}) {
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // time the comment is pinned to; null = follow the playhead
  const [pinned, setPinned] = useState<number | null>(null);

  // Pause and pin to the exact current time. Re-pin whenever the draft is empty, so
  // clicking in and out without posting doesn't leave a stale time behind.
  function startComment() {
    const now = onFocus();
    if (!body.trim() || pinned === null) setPinned(now);
    return now;
  }
  const [timeText, setTimeText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const t = pinned ?? time;

  function toggle(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const err = await onSubmit({ t_sec: Math.round(t * 10) / 10, body: body.trim(), tags });
    setBusy(false);
    if (err) return setError(err);
    setBody("");
    setTags([]);
    setPinned(null);
    setError(null);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-start gap-2">
        <Avatar profile={me} size={28} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={startComment}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          rows={2}
          placeholder={`Comment at ${formatTime(t)}…`}
          className="flex-1 resize-y rounded-md border border-line px-2 py-1.5 text-sm outline-none focus:border-maroon"
        />
      </div>

      {allowTags && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9">
          <span className="text-xs text-muted">About:</span>
          <button
            type="button"
            onClick={() => setTags([])}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              tags.length === 0 ? "border-ink bg-ink text-white" : "border-line text-muted"
            }`}
          >
            General
          </button>
          {taggable.map((p) => {
            const on = tags.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className="rounded-full border px-2 py-0.5 text-xs"
                style={on ? { background: p.color, borderColor: p.color, color: "white" } : { borderColor: "#e8e1d8" }}
              >
                {p.id === me.id ? "Me" : p.display_name}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 pl-9">
        <label className="flex items-center gap-1 text-xs text-muted">
          at
          <input
            value={timeText ?? formatTime(t)}
            onFocus={() => {
              const now = startComment();
              setTimeText(formatTime(!body.trim() || pinned === null ? now : pinned));
            }}
            onChange={(e) => setTimeText(e.target.value)}
            onBlur={() => {
              const parsed = timeText !== null ? parseTime(timeText) : null;
              if (parsed !== null) setPinned(parsed);
              setTimeText(null);
            }}
            className="w-16 rounded border border-line px-1 py-0.5 font-mono text-ink"
          />
        </label>
        {pinned !== null && (
          <button type="button" onClick={() => setPinned(null)} className="text-xs text-muted hover:text-ink">
            use playhead
          </button>
        )}
        {error && <span className="text-xs text-red-700">{error}</span>}
        <button
          disabled={busy || !body.trim()}
          className="ml-auto rounded-md bg-maroon px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </form>
  );
}
