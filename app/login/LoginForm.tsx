"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { claimAccount } from "./actions";

const ERRORS: Record<string, string> = {
  "not-invited": "There's no account for this email yet. Ask a captain to add you from the Team page.",
};

// Fresh form on each visit (Next keeps visited pages alive, which would otherwise bring
// this back still showing "Loading your videos…" after signing out).
export function LoginForm() {
  return <Form key={useRouter().bfcacheId} />;
}

function Form() {
  const router = useRouter();
  const initialError = useSearchParams().get("error");
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(initialError ? (ERRORS[initialError] ?? "Sign-in failed.") : null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "setup" && password !== confirm) return setError("Passwords don't match.");
    setBusy(true);

    if (mode === "setup") {
      setStep("Setting up your account…");
      const res = await claimAccount({ email, password }); // also signs you in
      if ("error" in res) {
        setBusy(false);
        return setError(res.error);
      }
    } else {
      setStep("Signing in…");
      const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setBusy(false);
        return setError(/invalid/i.test(error.message) ? "Wrong email or password." : error.message);
      }
    }
    setStep("Loading your videos…");
    router.replace("/");
    router.refresh();
  }

  const input = "w-full rounded-md border border-line bg-white px-3 py-2";
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="you@andrew.cmu.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={input}
      />
      <input
        type="password"
        required
        minLength={mode === "setup" ? 8 : undefined}
        autoComplete={mode === "setup" ? "new-password" : "current-password"}
        placeholder={mode === "setup" ? "Choose a password (8+ characters)" : "Password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={input}
      />
      {mode === "setup" && (
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={input}
        />
      )}
      <button
        disabled={busy}
        className="w-full rounded-md bg-maroon px-3 py-2 font-medium text-white disabled:opacity-60"
      >
        {busy ? step : mode === "setup" ? "Set password & sign in" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "setup" : "signin");
          setError(null);
        }}
        className="w-full text-sm text-muted hover:text-ink"
      >
        {mode === "signin" ? "First time here? Set up your account" : "Already set up? Sign in"}
      </button>
      <p className="text-center text-xs text-muted">
        {mode === "signin"
          ? "Forgot your password? Ask a captain to reset it, then use “First time here?”."
          : "Use the email a captain added you with."}
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
