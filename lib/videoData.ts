import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Comment, Jathi, JathiMark, Profile, Video } from "./types";

/** Everything the review and jathi-marking screens need. RLS decides visibility; hidden = 404. */
export async function loadVideo(id: string, me: Profile) {
  const supabase = await createClient();
  const { data: video } = await supabase.from("videos").select("*").eq("id", id).maybeSingle();
  if (!video) notFound();

  const [profiles, participants, jathis, marks, comments] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role, color").order("display_name"),
    supabase.from("video_participants").select("user_id").eq("video_id", id),
    video.song_id
      ? supabase.from("jathis").select("*").eq("song_id", video.song_id).order("position")
      : Promise.resolve({ data: [] }),
    supabase.from("video_jathi_marks").select("jathi_id, start_sec").eq("video_id", id),
    supabase.from("comments").select("id, video_id, author_id, t_sec, body, tags, created_at").eq("video_id", id),
  ]);

  return {
    video: video as Video,
    profiles: (profiles.data ?? []) as Profile[],
    participantIds: (participants.data ?? []).map((p) => p.user_id as string),
    jathis: (jathis.data ?? []) as Jathi[],
    marks: (marks.data ?? []).map((m) => ({ ...m, start_sec: Number(m.start_sec) })) as JathiMark[],
    comments: (comments.data ?? []).map((c) => ({ ...c, t_sec: Number(c.t_sec) })) as Comment[],
    canEdit: video.uploaded_by === me.id || me.role === "captain",
  };
}
