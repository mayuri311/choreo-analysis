import type { Comment, JathiMark } from "./types";

/** "general" matches only untagged comments. */
export type PersonFilter = string | "general" | null;

/** Marks sorted by start time. */
export function sortMarks(marks: JathiMark[]): JathiMark[] {
  return [...marks].sort((a, b) => a.start_sec - b.start_sec);
}

/**
 * The jathi playing at time t: the last mark whose start <= t.
 * Before the first mark there is no jathi (warm-up, intro walk-on, etc).
 */
export function jathiAt(t: number, marks: JathiMark[]): string | null {
  let current: string | null = null;
  for (const m of sortMarks(marks)) {
    if (m.start_sec <= t) current = m.jathi_id;
    else break;
  }
  return current;
}

/** [start, end) span of each marked jathi; the last runs to the end of the video. */
export function jathiSpans(
  marks: JathiMark[],
  duration: number,
): { jathi_id: string; start: number; end: number }[] {
  const sorted = sortMarks(marks);
  return sorted.map((m, i) => ({
    jathi_id: m.jathi_id,
    start: m.start_sec,
    end: i + 1 < sorted.length ? sorted[i + 1].start_sec : duration,
  }));
}

export function isGeneral(c: Pick<Comment, "tags">): boolean {
  return c.tags.length === 0;
}

/**
 * Person filter keeps comments tagging that person plus general comments.
 * Jathi filter keeps comments whose timestamp falls in that jathi.
 * Both together are ANDed.
 */
export function filterComments<C extends Pick<Comment, "t_sec" | "tags">>(
  comments: C[],
  marks: JathiMark[],
  opts: { person?: PersonFilter; jathi?: string | null },
): C[] {
  const { person = null, jathi = null } = opts;
  return comments.filter((c) => {
    if (person === "general" && !isGeneral(c)) return false;
    if (person && person !== "general" && !isGeneral(c) && !c.tags.includes(person)) {
      return false;
    }
    if (jathi && jathiAt(c.t_sec, marks) !== jathi) return false;
    return true;
  });
}
