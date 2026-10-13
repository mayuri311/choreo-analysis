import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Song } from "@/lib/types";
import { NewVideoForm } from "./NewVideoForm";

export default function NewVideoPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<p className="mt-6 text-muted">Loading…</p>}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const [{ data: songs }, { data: profiles }] = await Promise.all([
    supabase.from("songs").select("id, title").order("title"),
    supabase.from("profiles").select("id, display_name, role, color").order("display_name"),
  ]);
  const isCaptain = me.role === "captain";
  return (
    <>
      <h1 className="text-2xl font-semibold">{isCaptain ? "Add a video" : "Add a retention video"}</h1>
      <p className="mt-1 text-sm text-muted">
        Upload to YouTube as <b>Unlisted</b>, then paste the link here.
        {!isCaptain && " Only you and the captains will see it."}
      </p>
      <NewVideoForm me={me} songs={(songs ?? []) as Song[]} profiles={(profiles ?? []) as Profile[]} />
    </>
  );
}
