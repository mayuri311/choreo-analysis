"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  link: "That sign-in link expired or was already used. Request a new one.",
  "not-invited": "Your account isn't on the team list. Ask a captain to invite you.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "info"; text: string } | null>(
    params.get("error") ? { kind: "error", text: ERRORS[params.get("error")!] ?? "Sign-in failed." } : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    if (usePassword) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setStatus({ kind: "error", text: error.message });
      router.replace("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) {
        const notInvited = /invite list|Database error/i.test(error.message);
        return setStatus({ kind: "error", text: notInvited ? ERRORS["not-invited"] : error.message });
      }
      setStatus({ kind: "info", text: `Check ${email} for a sign-in link.` });
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        placeholder="you@andrew.cmu.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border border-line bg-white px-3 py-2"
      />
      {usePassword && (
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-line bg-white px-3 py-2"
        />
      )}
      <button
        disabled={busy}
        className="w-full rounded-md bg-maroon px-3 py-2 font-medium text-white disabled:opacity-60"
      >
        {busy ? "…" : usePassword ? "Sign in" : "Email me a sign-in link"}
      </button>
      <button
        type="button"
        onClick={() => setUsePassword((v) => !v)}
        className="w-full text-sm text-muted hover:text-ink"
      >
        {usePassword ? "Use a magic link instead" : "Sign in with a password"}
      </button>
      {status && (
        <p className={`text-sm ${status.kind === "error" ? "text-red-700" : "text-green-800"}`}>{status.text}</p>
      )}
    </form>
  );
}
