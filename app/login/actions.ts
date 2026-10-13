"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * First visit: a teammate a captain has added chooses their password. Only works for
 * emails on the team whose account hasn't been set up yet (or was reset by a captain).
 * No email is sent, so this trusts that whoever types an unclaimed team email is that
 * person; captains can see who has set up on the Team page and reset if needed.
 */
async function claim(input: {
  email: string;
  password: string;
}): Promise<{ error: string } | { ok: true }> {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) return { error: "Use at least 8 characters." };

  const admin = createAdminClient();
  // Claim in one step: flip the flag only if it's still unset, so if two people race for
  // one account exactly one wins, and the loser never touches the password.
  const { data: claimed, error: flagErr } = await admin
    .from("profiles")
    .update({ password_set: true })
    .eq("email", email)
    .eq("password_set", false)
    .select("id");
  if (flagErr) return { error: flagErr.message };
  const id = claimed?.[0]?.id;
  if (!id) {
    const { data: exists } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    return {
      error: exists
        ? "This account is already set up. Sign in with your password."
        : "That email isn't on the team. Ask a captain to add you.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password: input.password });
  if (error) {
    await admin.from("profiles").update({ password_set: false }).eq("id", id);
    return { error: error.message };
  }

  // Sign in here too: sets the session cookie in this same response, saving the browser
  // a separate round trip to Supabase.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (signInErr) return { error: signInErr.message };
  return { ok: true };
}

export async function claimAccount(input: {
  email: string;
  password: string;
}): Promise<{ error: string } | { ok: true }> {
  try {
    return await claim(input);
  } catch (e) {
    console.error("claimAccount failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/SUPABASE_SERVICE_ROLE_KEY/.test(msg)) {
      return { error: "Account setup isn't configured on the server yet (missing service role key). Tell a captain." };
    }
    return { error: "Something went wrong setting up your account. Try again." };
  }
}
