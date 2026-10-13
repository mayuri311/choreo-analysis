"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm({ firstTime }: { firstTime: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      if (/reauth|recent/i.test(error.message)) {
        return setError("Sign out and back in, then change your password.");
      }
      return setError(error.message);
    }
    const { error: markErr } = await supabase.rpc("mark_password_set");
    if (markErr) {
      setBusy(false);
      return setError(markErr.message);
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="New password (8+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md border border-line bg-white px-3 py-2"
      />
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full rounded-md border border-line bg-white px-3 py-2"
      />
      <button
        disabled={busy}
        className="w-full rounded-md bg-maroon px-3 py-2 font-medium text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : firstTime ? "Save password & continue" : "Change password"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
