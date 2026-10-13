"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { filterComments, jathiAt, jathiSpans, type PersonFilter } from "@/lib/filterComments";
import { createClient } from "@/lib/supabase/client";
import type { Comment, Jathi, JathiMark, Profile, Video } from "@/lib/types";
import { CommentComposer } from "./CommentComposer";
import { CommentList, type ListComment } from "./CommentList";
import { FilterBar } from "./FilterBar";
import { JATHI_COLORS, Timeline, type TimelineSpan } from "./Timeline";
import { useYouTubePlayer } from "./useYouTubePlayer";

const COMMENT_COLS = "id, video_id, author_id, t_sec, body, tags, created_at";

export function ReviewPlayer({
  video,
  me,
  profiles,
  participantIds,
  jathis,
  marks,
  initialComments,
  canEdit,
}: {
  video: Video;
  me: Profile;
  profiles: Profile[];
  participantIds: string[];
  jathis: Jathi[];
  marks: JathiMark[];
  initialComments: Comment[];
  canEdit: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { containerRef, time, duration: playerDuration, playing, seek, play, pause, getTime } =
    useYouTubePlayer(video.youtube_id);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const isPractice = video.kind === "practice";
  const canComment = isPractice || me.role === "captain";

  // ---- filters live in the URL so a filtered view can be shared
  const params = useSearchParams();
  const [person, setPerson] = useState<PersonFilter>(isPractice ? params.get("person") : null);
  const [jathi, setJathi] = useState<string | null>(params.get("jathi"));
  useEffect(() => {
    const sp = new URLSearchParams();
    if (person) sp.set("person", person);
    if (jathi) sp.set("jathi", jathi);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }, [person, jathi]);

  // ---- lookups
  const people = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const participants = useMemo(() => {
    const ids = participantIds.length ? participantIds : profiles.map((p) => p.id);
    return ids.map((id) => people.get(id)).filter((p): p is Profile => !!p);
  }, [participantIds, profiles, people]);
  const jathiName = useMemo(() => new Map(jathis.map((j) => [j.id, j.name])), [jathis]);

  const duration = playerDuration || Number(video.duration_sec) || 0;
  const spans: TimelineSpan[] = useMemo(
    () =>
      jathiSpans(marks, duration).map((s, i) => ({
        ...s,
        name: jathiName.get(s.jathi_id) ?? "?",
        color: JATHI_COLORS[i % JATHI_COLORS.length],
      })),
    [marks, duration, jathiName],
  );

  const visible: ListComment[] = useMemo(
    () =>
      filterComments(comments, marks, { person, jathi })
        .sort((a, b) => a.t_sec - b.t_sec)
        .map((c) => {
          const j = jathiAt(c.t_sec, marks);
          return {
            ...c,
            author: people.get(c.author_id) ?? { id: c.author_id, display_name: "?", role: "member", color: "#6b625c" },
            jathiName: j ? (jathiName.get(j) ?? null) : null,
          };
        }),
    [comments, marks, person, jathi, people, jathiName],
  );

  const activeId = useMemo(() => {
    let id: string | null = null;
    for (const c of visible) if (c.t_sec <= time + 0.25) id = c.id;
    return id;
  }, [visible, time]);

  // ---- realtime: other people's comments appear live
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${video.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `video_id=eq.${video.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setComments((cs) => cs.filter((c) => c.id !== id));
          } else {
            const row = payload.new as Comment;
            setComments((cs) => [...cs.filter((c) => c.id !== row.id), { ...row, t_sec: Number(row.t_sec) }]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, video.id]);

  // ---- remember this visit (for "new comments" badges) and backfill duration.
  // Supabase queries are lazy, so these need a .then() to actually run.
  useEffect(() => {
    supabase
      .from("video_views")
      .upsert({ video_id: video.id, user_id: me.id, last_seen_at: new Date().toISOString() })
      .then();
  }, [supabase, video.id, me.id]);
  useEffect(() => {
    if (canEdit && playerDuration && !video.duration_sec) {
      supabase.from("videos").update({ duration_sec: Math.round(playerDuration) }).eq("id", video.id).then();
    }
  }, [canEdit, playerDuration, video.duration_sec, video.id, supabase]);

  const post = useCallback(
    async (c: { t_sec: number; body: string; tags: string[] }) => {
      const { data, error } = await supabase
        .from("comments")
        .insert({ video_id: video.id, author_id: me.id, ...c })
        .select(COMMENT_COLS)
        .single();
      if (error) return error.message;
      setComments((cs) => [...cs.filter((x) => x.id !== data.id), { ...(data as Comment), t_sec: Number(data.t_sec) }]);
      play();
      return null;
    },
    [supabase, video.id, me.id, play],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (!error) setComments((cs) => cs.filter((c) => c.id !== id));
    },
    [supabase],
  );

  const subject = video.subject_id ? people.get(video.subject_id) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold">{video.title}</h1>
          <span className={`rounded px-1.5 py-0.5 text-xs ${isPractice ? "bg-maroon-light text-maroon" : "bg-gold-light text-[#7a5d00]"}`}>
            {isPractice ? "Practice" : `Retention · ${subject?.display_name ?? ""}`}
          </span>
          {canEdit && (
            <Link href={`/videos/${video.id}/jathis`} className="ml-auto text-sm text-muted hover:text-ink">
              {marks.length ? "Edit jathi marks" : "Mark jathis →"}
            </Link>
          )}
        </div>

        <div
          ref={containerRef}
          className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full"
        />

        <Timeline
          duration={duration}
          time={time}
          playing={playing}
          spans={spans}
          comments={visible}
          activeJathi={jathi}
          onSeek={seek}
          onJathiClick={(id) => setJathi((cur) => (cur === id ? null : id))}
        />

        {canComment ? (
          <CommentComposer
            me={me}
            time={time}
            taggable={participants}
            allowTags={isPractice}
            onFocus={() => {
              pause();
              return getTime();
            }}
            onSubmit={post}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
            Captains leave feedback on retention videos. You&apos;ll see it here as it comes in.
          </p>
        )}
      </div>

      <aside className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] lg:flex lg:flex-col">
        <FilterBar
          me={me}
          people={participants}
          spans={spans}
          person={person}
          jathi={jathi}
          showPeople={isPractice}
          onPerson={setPerson}
          onJathi={setJathi}
        />
        <p className="mt-3 text-xs text-muted">
          {visible.length} of {comments.length} comments
        </p>
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
          <CommentList
            comments={visible}
            people={people}
            me={me}
            activeId={activeId}
            follow={playing}
            showTags={isPractice}
            onSeek={(t) => {
              seek(t);
              play();
            }}
            onDelete={remove}
          />
        </div>
      </aside>
    </div>
  );
}
