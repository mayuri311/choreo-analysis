"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSong } from "@/lib/songs";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Song, VideoKind } from "@/lib/types";
import { parseYouTubeId } from "@/lib/youtube";

const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

type Props = { me: Profile; songs: Song[]; profiles: Profile[] };

// Next keeps visited pages alive, so without a key this form would come back still
// showing "Adding…" and the last video's details. bfcacheId changes on each fresh visit
// (link click / push) but not on browser back, which keeps a half-filled draft.
export function NewVideoForm(props: Props) {
  return <Form key={useRouter().bfcacheId} {...props} />;
}

const submitLabel = (kind: VideoKind) => (kind === "practice" ? "Add video & mark jathis" : "Add retention video");

function Form({ me, songs, profiles }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isCaptain = me.role === "captain";

  const [url, setUrl] = useState("");
  // dancers can only upload retention videos of themselves
  const [kind, setKind] = useState<VideoKind>(isCaptain ? "practice" : "retention");
  const [title, setTitle] = useState("");
  const [songId, setSongId] = useState(songs[0]?.id ?? "");
  const [newSong, setNewSong] = useState(songs.length === 0);
  const [songTitle, setSongTitle] = useState("");
  const [jathiText, setJathiText] = useState("");
  const [recordedOn, setRecordedOn] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [subjectId, setSubjectId] = useState(me.id);
  const [participants, setParticipants] = useState(() => new Set(profiles.map((p) => p.id)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const youtubeId = parseYouTubeId(url);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeId) return setError("That doesn't look like a YouTube link.");
    setBusy(true);
    setError(null);
    try {
      let song = songId || null;
      if (newSong && songTitle.trim()) song = (await createSong(supabase, songTitle, jathiText)).id;

      const { data: video, error: vErr } = await supabase
        .from("videos")
        .insert({
          kind,
          youtube_id: youtubeId,
          title:
            title.trim() ||
            (kind === "retention"
              ? `${profiles.find((p) => p.id === subjectId)?.display_name} – retention`
              : "Practice"),
          song_id: song,
          recorded_on: recordedOn || null,
          uploaded_by: me.id,
          subject_id: kind === "retention" ? subjectId : null,
        })
        .select("id")
        .single();
      if (vErr) throw vErr;

      if (kind === "practice" && participants.size) {
        const { error: pErr } = await supabase
          .from("video_participants")
          .insert([...participants].map((user_id) => ({ video_id: video.id, user_id })));
        if (pErr) throw pErr;
      }
      router.push(song ? `/videos/${video.id}/jathis` : `/videos/${video.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String((err as { message?: string }).message ?? err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div>
        <label className="text-sm font-medium">YouTube link</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://youtu.be/…"
          className={input}
        />
        {url && !youtubeId && <p className="mt-1 text-xs text-red-700">Couldn&apos;t find a video id in that link.</p>}
        {youtubeId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="mt-2 w-48 rounded" />
        )}
      </div>

      {isCaptain && (
        <div>
          <span className="text-sm font-medium">Type</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(
              [
                ["practice", "Team practice", "Everyone comments and tags people"],
                ["retention", "Retention check", "Only captains comment"],
              ] as const
            ).map(([k, label, hint]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-lg border p-3 text-left ${kind === k ? "border-maroon bg-maroon-light" : "border-line bg-white"}`}
              >
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday full run"
            className={input}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Recorded on</label>
          <input type="date" value={recordedOn} onChange={(e) => setRecordedOn(e.target.value)} className={input} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Song</label>
        {!newSong ? (
          <div className="flex gap-2">
            <select value={songId} onChange={(e) => setSongId(e.target.value)} className={input}>
              <option value="">— none —</option>
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNewSong(true)}
              className="mt-1 whitespace-nowrap text-sm text-maroon"
            >
              + New song
            </button>
          </div>
        ) : (
          <div className="mt-1 space-y-2 rounded-lg border border-line bg-white p-3">
            <input
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Song title"
              className={input}
            />
            <textarea
              value={jathiText}
              onChange={(e) => setJathiText(e.target.value)}
              rows={5}
              placeholder={"Jathis in order, one per line\nOpening\nJathi 1\nJathi 2\n…"}
              className={input}
            />
            {songs.length > 0 && (
              <button type="button" onClick={() => setNewSong(false)} className="text-xs text-muted">
                Pick an existing song instead
              </button>
            )}
          </div>
        )}
      </div>

      {kind === "retention" ? (
        <div>
          <label className="text-sm font-medium">Dancer</label>
          {isCaptain ? (
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={input}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-muted">You. Only you and the captains will see this video.</p>
          )}
        </div>
      ) : (
        <div>
          <span className="text-sm font-medium">Who&apos;s in it</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
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
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={
                    on ? { background: p.color, borderColor: p.color, color: "white" } : { borderColor: "#e8e1d8" }
                  }
                >
                  {p.display_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="rounded-md bg-maroon px-4 py-2 font-medium text-white disabled:opacity-50">
        {busy ? "Adding…" : submitLabel(kind)}
      </button>
    </form>
  );
}
