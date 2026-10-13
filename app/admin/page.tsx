import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "./AdminPanel";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const me = await getCurrentProfile();
  if (me.role !== "captain") redirect("/");
  const supabase = await createClient();
  const [invites, profiles, songs] = await Promise.all([
    supabase.from("allowed_emails").select("*").order("email"),
    supabase.from("profiles").select("id, email, display_name, role, color").order("display_name"),
    supabase.from("songs").select("id, title, jathis(id, name, position)").order("title"),
  ]);
  return (
    <AdminPanel
      me={me}
      invites={invites.data ?? []}
      profiles={profiles.data ?? []}
      songs={songs.data ?? []}
    />
  );
}
