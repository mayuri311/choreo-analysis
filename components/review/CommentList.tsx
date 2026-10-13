"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/Avatar";
import { formatTime } from "@/lib/youtube";
import type { Profile } from "@/lib/types";

export type ListComment = {
  id: string;
  t_sec: number;
  body: string;
  tags: string[];
  author: Profile;
  jathiName: string | null;
};

export function CommentList({
  comments,
  people,
  me,
  activeId,
  follow,
  showTags,
  onSeek,
  onDelete,
}: {
  comments: ListComment[];
  people: Map<string, Profile>;
  me: Profile;
  /** the comment nearest before the playhead */
  activeId: string | null;
  /** scroll the active comment into view (while playing) */
  follow: boolean;
  showTags: boolean;
  onSeek: (t: number) => void;
  onDelete: (id: string) => void;
}) {
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (follow) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId, follow]);

  if (comments.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-muted">No comments match these filters yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {comments.map((c, i) => {
        const header = i === 0 || comments[i - 1].jathiName !== c.jathiName;
        const active = c.id === activeId;
        return (
          <li key={c.id} ref={active ? activeRef : undefined}>
            {header && (
              <p className="sticky top-0 z-10 bg-paper/95 px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur">
                {c.jathiName ?? "Before first jathi"}
              </p>
            )}
            <div
              className={`group flex gap-2 rounded-md px-2 py-2 transition-colors ${
                active ? "bg-gold-light" : "hover:bg-white"
              }`}
            >
              <Avatar profile={c.author} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium">{c.author.display_name}</span>
                  <button
                    type="button"
                    onClick={() => onSeek(c.t_sec)}
                    className="font-mono text-xs text-maroon hover:underline"
                  >
                    {formatTime(c.t_sec)}
                  </button>
                  {(c.author.id === me.id || me.role === "captain") && (
                    <button
                      type="button"
                      onClick={() => confirm("Delete this comment?") && onDelete(c.id)}
                      className="ml-auto text-xs text-muted opacity-0 hover:text-red-700 group-hover:opacity-100"
                    >
                      delete
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                {showTags && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.tags.length === 0 ? (
                      <span className="rounded-full bg-line px-1.5 py-px text-[11px] text-muted">General</span>
                    ) : (
                      c.tags.map((id) => {
                        const p = people.get(id);
                        return (
                          <span
                            key={id}
                            className="rounded-full px-1.5 py-px text-[11px] text-white"
                            style={{ background: p?.color ?? "#6b625c" }}
                          >
                            @{id === me.id ? "me" : (p?.display_name ?? "unknown")}
                          </span>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
