import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** The signed-in team member, or a redirect to /login. Call inside a Suspense boundary. */
export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, color")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?error=not-invited");
  return profile as Profile;
}
