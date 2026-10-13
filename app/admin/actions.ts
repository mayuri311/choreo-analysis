"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

type Result = { error: string } | { ok: string };

async function requireCaptain() {
  const me = await getCurrentProfile();
  if (me.role !== "captain") throw new Error("Only captains can manage the team");
  return me;
}

/**
 * Add someone to the team: put them on the invite list and create their account right
 * away (no email is sent), so they can be added to videos and tagged immediately.
 * The first time they visit, they claim it by choosing a password (see app/login/actions.ts).
 */
export async function inviteMember(input: { email: string; name: string; role: Role }): Promise<Result> {
  await requireCaptain();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };

  const supabase = await createClient();
  const { error: listErr } = await supabase
    .from("allowed_emails")
    .upsert({ email, display_name: input.name.trim() || null, role: input.role });
  if (listErr) return { error: listErr.message };

  const { error } = await createAdminClient().auth.admin.createUser({ email, email_confirm: true });
  if (error) {
    if (/already been registered|already registered|exists/i.test(error.message)) {
      return { error: `${email} is already on the team.` };
    }
    return { error: error.message };
  }
  revalidatePath("/admin");
  return { ok: `Added ${email}. Tell them to open the site and choose “First time here?”.` };
}

/**
 * Forgot password: scramble the old one and let them set it up again with "First time here?".
 */
export async function resetPassword(userId: string): Promise<Result> {
  const me = await requireCaptain();
  if (userId === me.id) return { error: "Change your own password from the Password page." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(userId, { password: crypto.randomUUID() + "Aa1!" });
  if (error) return { error: error.message };
  const { error: flagErr } = await admin.from("profiles").update({ password_set: false }).eq("id", userId);
  if (flagErr) return { error: flagErr.message };
  revalidatePath("/admin");
  return { ok: `Reset ${data.user.email}. They can now choose a new password with “First time here?”.` };
}

/** Remove someone who was invited but never finished setting up. */
export async function removePendingMember(userId: string): Promise<Result> {
  const me = await requireCaptain();
  if (userId === me.id) return { error: "You can't remove yourself." };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("email, password_set").eq("id", userId).single();
  if (!profile) return { error: "Member not found." };
  if (profile.password_set) return { error: "This member has already set up their account." };

  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  await supabase.from("allowed_emails").delete().eq("email", profile.email);
  revalidatePath("/admin");
  return { ok: `Removed ${profile.email}.` };
}
