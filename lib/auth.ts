import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * The signed-in team member, or a redirect to /login. Members who haven't chosen a
 * password yet (first email-link sign-in) are sent to set one before using the app.
 * Call inside a Suspense boundary.
 */
export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, color, password_set")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?error=not-invited");
  if (!profile.password_set) redirect("/account/password");
  return { id: profile.id, display_name: profile.display_name, role: profile.role, color: profile.color } as Profile;
}
