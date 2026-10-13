import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "./Avatar";

export async function NavBar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const { data: me } = userId
    ? await supabase.from("profiles").select("id, display_name, role, color").eq("id", userId).single()
    : { data: null };

  return (
    <header className="h-14 border-b border-line bg-white">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center gap-6">
        <Link href="/" className="font-semibold text-maroon tracking-tight">
          Choreo Review
        </Link>
        {me && (
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/" className="hover:text-ink">Dashboard</Link>
            <Link href="/videos/new" className="hover:text-ink">Add video</Link>
            {me.role === "captain" && <Link href="/admin" className="hover:text-ink">Team</Link>}
          </nav>
        )}
        {me && (
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Avatar profile={me} size={28} />
            <span className="hidden sm:inline">{me.display_name}</span>
            {me.role === "captain" && (
              <span className="rounded bg-gold-light px-1.5 py-0.5 text-xs text-[#7a5d00]">captain</span>
            )}
            <form action="/auth/signout" method="post">
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
