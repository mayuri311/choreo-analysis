"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * First visit: a teammate a captain has added chooses their password. Only works for
 * emails on the team whose account hasn't been set up yet (or was reset by a captain).
 * No email is sent, so this trusts that whoever types an unclaimed team email is that
 * person; captains can see who has set up on the Team page and reset if needed.
 */
export async function claimAccount(input: {
  email: string;
  password: string;
}): Promise<{ error: string } | { ok: true }> {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) return { error: "Use at least 8 characters." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, password_set").eq("email", email).maybeSingle();
  if (!profile) return { error: "That email isn't on the team. Ask a captain to add you." };
  if (profile.password_set) return { error: "This account is already set up. Sign in with your password." };

  // Claim first: flip the flag only if it's still unset, so if two people race for one
  // account exactly one wins, and the loser never touches the password.
  const { data: claimed, error: flagErr } = await admin
    .from("profiles")
    .update({ password_set: true })
    .eq("id", profile.id)
    .eq("password_set", false)
    .select("id");
  if (flagErr) return { error: flagErr.message };
  if (!claimed?.length) return { error: "This account is already set up. Sign in with your password." };

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: input.password });
  if (error) {
    await admin.from("profiles").update({ password_set: false }).eq("id", profile.id);
    return { error: error.message };
  }
  return { ok: true };
}
