export type Role = "member" | "captain";
export type VideoKind = "practice" | "retention";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  color: string;
};

export type Song = { id: string; title: string };

export type Jathi = { id: string; song_id: string; name: string; position: number };

export type JathiMark = { jathi_id: string; start_sec: number };

export type Video = {
  id: string;
  kind: VideoKind;
  youtube_id: string;
  title: string;
  song_id: string | null;
  recorded_on: string | null;
  uploaded_by: string;
  subject_id: string | null;
  duration_sec: number | null;
  created_at: string;
};

export type Comment = {
  id: string;
  video_id: string;
  author_id: string;
  t_sec: number;
  body: string;
  created_at: string;
  /** user ids tagged on this comment; empty = general */
  tags: string[];
};
