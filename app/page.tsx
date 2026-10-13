import Link from "next/link";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile, VideoKind } from "@/lib/types";

type Row = {
  id: string;
  kind: VideoKind;
  youtube_id: string;
  title: string;
  song_title: string | null;
  recorded_on: string | null;
  subject_id: string | null;
  subject_name: string | null;
  created_at: string;
  is_participant: boolean;
  comment_count: number;
  tagged_me: number;
  new_count: number;
  captain_comments: number;
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your videos…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_dashboard");
  if (error) throw error;
  const rows = (data ?? []) as Row[];

  const practiceMine = rows.filter((r) => r.kind === "practice" && r.is_participant);
  const practiceOther = rows.filter((r) => r.kind === "practice" && !r.is_participant);
  const retentionMine = rows.filter((r) => r.kind === "retention" && r.subject_id === me.id);
  const toReview = rows.filter(
    (r) => r.kind === "retention" && r.subject_id !== me.id && Number(r.captain_comments) === 0,
  );
  const reviewed = rows.filter(
    (r) => r.kind === "retention" && r.subject_id !== me.id && Number(r.captain_comments) > 0,
  );
  const isCaptain = me.role === "captain";

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hi, {me.display_name.replace(/\s*\(.*\)/, "")}</h1>
          <p className="text-sm text-muted">Videos you&apos;re in, and feedback waiting for you.</p>
        </div>
        <Link href="/videos/new" className="rounded-md bg-maroon px-3 py-2 text-sm font-medium text-white">
          + Add video
        </Link>
      </div>

      {isCaptain && (
        <Section title="Retention videos to review" empty="Nothing waiting. Nice.">
          {toReview.map((r) => <Card key={r.id} row={r} me={me} />)}
        </Section>
      )}
      <Section title="Practice videos you're in" empty="You haven't been added to any practice videos yet.">
        {practiceMine.map((r) => <Card key={r.id} row={r} me={me} />)}
      </Section>
      <Section title="Your retention videos" empty="Upload a retention video to get captain feedback.">
        {retentionMine.map((r) => <Card key={r.id} row={r} me={me} />)}
      </Section>
      {isCaptain && reviewed.length > 0 && (
        <Section title="Reviewed retention videos">
          {reviewed.map((r) => <Card key={r.id} row={r} me={me} />)}
        </Section>
      )}
      {practiceOther.length > 0 && (
        <Section title="Other practice videos">
          {practiceOther.map((r) => <Card key={r.id} row={r} me={me} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  if (children.length === 0 && !empty) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

function Card({ row, me }: { row: Row; me: Profile }) {
  const href = row.kind === "practice" && row.is_participant ? `/videos/${row.id}?person=${me.id}` : `/videos/${row.id}`;
  const date = row.recorded_on
    ? new Date(row.recorded_on + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  return (
    <Link href={href} className="group overflow-hidden rounded-lg border border-line bg-white hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${row.youtube_id}/mqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover opacity-90 group-hover:opacity-100"
        />
        <span
          className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-xs font-medium ${
            row.kind === "practice" ? "bg-white/90 text-maroon" : "bg-gold text-ink"
          }`}
        >
          {row.kind === "practice" ? "Practice" : `Retention · ${row.subject_name ?? ""}`}
        </span>
        {Number(row.new_count) > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-maroon px-2 py-0.5 text-xs font-medium text-white">
            {row.new_count} new
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium leading-tight">{row.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {[row.song_title, date].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 flex gap-3 text-xs text-muted">
          <span>{row.comment_count} comments</span>
          {row.kind === "practice" && Number(row.tagged_me) > 0 && (
            <span className="font-medium text-maroon">{row.tagged_me} about you</span>
          )}
          {row.kind === "retention" && (
            <span className={Number(row.captain_comments) > 0 ? "text-green-800" : ""}>
              {Number(row.captain_comments) > 0 ? "Reviewed by captains" : "Awaiting captain review"}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
