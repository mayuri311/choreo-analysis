import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * The signed-in user's profile (or null), looked up once per request: the nav bar and
 * the page both need it, and each lookup is a round trip to Supabase.
 */
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, color, password_set")
    .eq("id", userId)
    .single();
  return profile as (Profile & { password_set: boolean }) | null;
});

/**
 * The signed-in team member, or a redirect to /login. Members who haven't chosen a
 * password yet are sent to set one before using the app.
 * Call inside a Suspense boundary.
 */
export async function getCurrentProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.password_set) redirect("/account/password");
  return { id: profile.id, display_name: profile.display_name, role: profile.role, color: profile.color };
}
