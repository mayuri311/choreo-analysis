import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

// Not behind getCurrentProfile(): that redirects here when no password is set.
export default function PasswordPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Password />
      </Suspense>
    </div>
  );
}

async function Password() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, password_set")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?error=not-invited");

  const firstTime = !profile.password_set;
  return (
    <>
      <h1 className="text-2xl font-semibold text-maroon">
        {firstTime ? `Welcome, ${profile.display_name.replace(/\s*\(.*\)/, "")}` : "Change your password"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {firstTime
          ? "Choose a password to finish setting up your account."
          : "Pick a new password for signing in."}
      </p>
      <SetPasswordForm firstTime={firstTime} />
    </>
  );
}
