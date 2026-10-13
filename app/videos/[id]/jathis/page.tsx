import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JathiMarker } from "@/components/JathiMarker";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Song } from "@/lib/types";
import { loadVideo } from "@/lib/videoData";

export default function JathiPage({ params }: PageProps<"/videos/[id]/jathis">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Setup params={params} />
    </Suspense>
  );
}

async function Setup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  const d = await loadVideo(id, me);
  if (!d.canEdit) redirect(`/videos/${id}`);
  const supabase = await createClient();
  const { data: songs } = await supabase.from("songs").select("id, title").order("title");
  return (
    <JathiMarker
      key={`${d.video.id}:${d.video.song_id}`}
      video={d.video}
      songs={(songs ?? []) as Song[]}
      jathis={d.jathis}
      marks={d.marks}
      profiles={d.profiles}
      participantIds={d.participantIds}
    />
  );
}
