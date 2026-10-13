import type { SupabaseClient } from "@supabase/supabase-js";

/** Create a song with its jathis in order. `jathiText` is one jathi name per line. */
export async function createSong(supabase: SupabaseClient, title: string, jathiText: string) {
  const { data: song, error } = await supabase.from("songs").insert({ title: title.trim() }).select("id, title").single();
  if (error) throw error;
  const names = jathiText.split("\n").map((s) => s.trim()).filter(Boolean);
  if (names.length) {
    const { error: jErr } = await supabase
      .from("jathis")
      .insert(names.map((name, i) => ({ song_id: song.id, name, position: i + 1 })));
    if (jErr) throw jErr;
  }
  return song as { id: string; title: string };
}
