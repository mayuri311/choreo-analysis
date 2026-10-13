"use client";

import type { PersonFilter } from "@/lib/filterComments";
import type { Profile } from "@/lib/types";
import type { TimelineSpan } from "./Timeline";

function Chip({
  on,
  onClick,
  children,
  color,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${
        on ? "text-white" : "border-line bg-white text-muted hover:text-ink"
      }`}
      style={on ? { background: color ?? "#1f1a17", borderColor: color ?? "#1f1a17" } : undefined}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  me,
  people,
  spans,
  person,
  jathi,
  showPeople,
  onPerson,
  onJathi,
}: {
  me: Profile;
  people: Profile[];
  spans: TimelineSpan[];
  person: PersonFilter;
  jathi: string | null;
  showPeople: boolean;
  onPerson: (p: PersonFilter) => void;
  onJathi: (j: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      {showPeople && (
        <div className="flex flex-wrap gap-1.5">
          <Chip on={person === null} onClick={() => onPerson(null)}>Everyone</Chip>
          <Chip on={person === me.id} onClick={() => onPerson(me.id)} color="#7f1d1d">
            About me
          </Chip>
          <Chip on={person === "general"} onClick={() => onPerson("general")}>General only</Chip>
          {people
            .filter((p) => p.id !== me.id)
            .map((p) => (
              <Chip key={p.id} on={person === p.id} onClick={() => onPerson(p.id)} color={p.color}>
                {p.display_name}
              </Chip>
            ))}
        </div>
      )}
      {spans.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Chip on={jathi === null} onClick={() => onJathi(null)}>All jathis</Chip>
          {spans.map((s) => (
            <Chip key={s.jathi_id} on={jathi === s.jathi_id} onClick={() => onJathi(s.jathi_id)} color="#7f1d1d">
              {s.name}
            </Chip>
          ))}
        </div>
      )}
      {showPeople && person && person !== "general" && (
        <p className="text-xs text-muted">General comments are always included.</p>
      )}
    </div>
  );
}
