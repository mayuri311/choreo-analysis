import { Suspense } from "react";
import { ReviewPlayer } from "@/components/review/ReviewPlayer";
import { getCurrentProfile } from "@/lib/auth";
import { loadVideo } from "@/lib/videoData";

export default function VideoPage({ params }: PageProps<"/videos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading video…</p>}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  const d = await loadVideo(id, me);
  return (
    <ReviewPlayer
      key={d.video.id}
      video={d.video}
      me={me}
      profiles={d.profiles}
      participantIds={d.participantIds}
      jathis={d.jathis}
      marks={d.marks}
      initialComments={d.comments}
      canEdit={d.canEdit}
    />
  );
}
