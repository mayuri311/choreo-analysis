"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createSong } from "@/lib/songs";
import { createClient } from "@/lib/supabase/client";
import { inviteMember, removePendingMember, resetPassword } from "./actions";
import type { Profile, Role } from "@/lib/types";

type Member = Profile & { email: string; password_set: boolean };
type SongRow = { id: string; title: string; jathis: { id: string; name: string; position: number }[] };

const input = "rounded-md border border-line bg-white px-2 py-1.5 text-sm";

export function AdminPanel({ me, profiles, songs }: { me: Profile; profiles: Member[]; songs: SongRow[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setError(error?.message ?? null);
    if (!error) router.refresh();
    return !error;
  }

  async function act(p: Promise<{ error: string } | { ok: string }>) {
    const r = await p;
    setError("error" in r ? r.error : null);
    setNotice("ok" in r ? r.ok : null);
    if ("ok" in r) router.refresh();
    return "ok" in r;
  }

  // invite form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("member");

  // song form
  const [songTitle, setSongTitle] = useState("");
  const [jathiText, setJathiText] = useState("");

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Team</h1>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {notice && <p className="text-sm text-green-800">{notice}</p>}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Members</h2>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-white">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Avatar profile={p} />
              <span className="font-medium">{p.display_name}</span>
              <span className="text-muted">{p.email}</span>
              {!p.password_set ? (
                <>
                  <span className="rounded bg-gold-light px-1.5 py-0.5 text-xs text-[#7a5d00]">not set up yet</span>
                  {p.id !== me.id && (
                    <button
                      onClick={() => confirm(`Remove ${p.email}?`) && act(removePendingMember(p.id))}
                      className="text-xs text-muted hover:text-red-700"
                    >
                      remove
                    </button>
                  )}
                </>
              ) : (
                p.id !== me.id && (
                  <button
                    onClick={() =>
                      confirm(`Reset ${p.display_name}'s password? They'll set a new one with “First time here?”.`) &&
                      act(resetPassword(p.id))
                    }
                    className="text-xs text-muted hover:text-ink"
                  >
                    reset password
                  </button>
                )
              )}
              <select
                value={p.role}
                disabled={p.id === me.id}
                onChange={(e) => run(supabase.rpc("set_role", { target: p.id, new_role: e.target.value }))}
                className={`ml-auto ${input}`}
              >
                <option value="member">member</option>
                <option value="captain">captain</option>
              </select>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Invite someone</h2>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await act(inviteMember({ email, name, role }));
            if (ok) {
              setEmail("");
              setName("");
            }
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className={input}
          />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="display name" className={input} />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={input}>
            <option value="member">member</option>
            <option value="captain">captain</option>
          </select>
          <button className="rounded-md bg-maroon px-3 py-1.5 text-sm text-white">Invite</button>
        </form>
        <p className="mt-1 text-xs text-muted">
          They get an email to join. Until they accept, they show as “invited” above, and can already be added to videos
          and tagged.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Songs &amp; jathis</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {songs.map((s) => (
            <div key={s.id} className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-baseline">
                <p className="font-medium">{s.title}</p>
                <button
                  onClick={() =>
                    confirm(`Delete "${s.title}" and its jathi marks?`) &&
                    run(supabase.from("songs").delete().eq("id", s.id))
                  }
                  className="ml-auto text-xs text-muted hover:text-red-700"
                >
                  delete
                </button>
              </div>
              <ol className="mt-1 list-decimal pl-5 text-sm text-muted">
                {[...s.jathis]
                  .sort((a, b) => a.position - b.position)
                  .map((j) => (
                    <li key={j.id}>{j.name}</li>
                  ))}
              </ol>
            </div>
          ))}
          <form
            className="space-y-2 rounded-lg border border-dashed border-line p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createSong(supabase, songTitle, jathiText);
                setSongTitle("");
                setJathiText("");
                setError(null);
                router.refresh();
              } catch (err) {
                setError((err as { message?: string }).message ?? "Failed to add song");
              }
            }}
          >
            <input
              required
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="New song title"
              className={`w-full ${input}`}
            />
            <textarea
              value={jathiText}
              onChange={(e) => setJathiText(e.target.value)}
              rows={4}
              placeholder="Jathis in order, one per line"
              className={`w-full ${input}`}
            />
            <button className="rounded-md bg-maroon px-3 py-1.5 text-sm text-white">Add song</button>
          </form>
        </div>
      </section>
    </div>
  );
}
