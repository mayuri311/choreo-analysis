"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createSong } from "@/lib/songs";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

type Invite = { email: string; display_name: string | null; role: Role };
type Member = Profile & { email: string };
type SongRow = { id: string; title: string; jathis: { id: string; name: string; position: number }[] };

const input = "rounded-md border border-line bg-white px-2 py-1.5 text-sm";

export function AdminPanel({
  me,
  invites,
  profiles,
  songs,
}: {
  me: Profile;
  invites: Invite[];
  profiles: Member[];
  songs: SongRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setError(error?.message ?? null);
    if (!error) router.refresh();
    return !error;
  }

  const joined = new Set(profiles.map((p) => p.email));
  const pending = invites.filter((i) => !joined.has(i.email));

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

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Members</h2>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-white">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Avatar profile={p} />
              <span className="font-medium">{p.display_name}</span>
              <span className="text-muted">{p.email}</span>
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
            const ok = await run(
              supabase.from("allowed_emails").insert({
                email: email.trim().toLowerCase(),
                display_name: name.trim() || null,
                role,
              }),
            );
            if (ok) {
              setEmail("");
              setName("");
            }
          }}
        >
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" className={input} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="display name" className={input} />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={input}>
            <option value="member">member</option>
            <option value="captain">captain</option>
          </select>
          <button className="rounded-md bg-maroon px-3 py-1.5 text-sm text-white">Invite</button>
        </form>
        <p className="mt-1 text-xs text-muted">They sign in at the login page with this email. No invite email is sent.</p>
        {pending.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {pending.map((i) => (
              <li key={i.email} className="flex items-center gap-2">
                <span>{i.email}</span>
                <span className="text-muted">{i.display_name}</span>
                <span className="text-xs text-muted">({i.role}, hasn&apos;t signed in)</span>
                <button
                  onClick={() => run(supabase.from("allowed_emails").delete().eq("email", i.email))}
                  className="text-xs text-muted hover:text-red-700"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Songs &amp; jathis</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {songs.map((s) => (
            <div key={s.id} className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-baseline">
                <p className="font-medium">{s.title}</p>
                <button
                  onClick={() => confirm(`Delete "${s.title}" and its jathi marks?`) && run(supabase.from("songs").delete().eq("id", s.id))}
                  className="ml-auto text-xs text-muted hover:text-red-700"
                >
                  delete
                </button>
              </div>
              <ol className="mt-1 list-decimal pl-5 text-sm text-muted">
                {[...s.jathis].sort((a, b) => a.position - b.position).map((j) => (
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
            <input required value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="New song title" className={`w-full ${input}`} />
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
