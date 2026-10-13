import { describe, expect, it } from "vitest";
import { filterComments, jathiAt, jathiSpans } from "./filterComments";

const marks = [
  { jathi_id: "j2", start_sec: 30 },
  { jathi_id: "j1", start_sec: 10 },
  { jathi_id: "j3", start_sec: 60 },
];

const c = (id: string, t_sec: number, tags: string[] = []) => ({ id, t_sec, tags });

describe("jathiAt", () => {
  it("is null before the first jathi", () => {
    expect(jathiAt(5, marks)).toBeNull();
  });
  it("starts a jathi exactly at its mark", () => {
    expect(jathiAt(10, marks)).toBe("j1");
    expect(jathiAt(29.99, marks)).toBe("j1");
    expect(jathiAt(30, marks)).toBe("j2");
  });
  it("runs the last jathi to the end", () => {
    expect(jathiAt(9999, marks)).toBe("j3");
  });
});

describe("jathiSpans", () => {
  it("sorts and closes the last span at duration", () => {
    expect(jathiSpans(marks, 90)).toEqual([
      { jathi_id: "j1", start: 10, end: 30 },
      { jathi_id: "j2", start: 30, end: 60 },
      { jathi_id: "j3", start: 60, end: 90 },
    ]);
  });
});

describe("filterComments", () => {
  const comments = [
    c("general-in-j1", 12),
    c("me-in-j1", 15, ["me"]),
    c("other-in-j1", 20, ["other"]),
    c("me-and-other-in-j2", 40, ["me", "other"]),
    c("other-in-j3", 70, ["other"]),
    c("general-in-j3", 75),
  ];
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

  it("no filter returns everything", () => {
    expect(ids(filterComments(comments, marks, {}))).toHaveLength(6);
  });

  it("person filter keeps tagged + general comments", () => {
    expect(ids(filterComments(comments, marks, { person: "me" }))).toEqual([
      "general-in-j1",
      "me-in-j1",
      "me-and-other-in-j2",
      "general-in-j3",
    ]);
  });

  it("general filter keeps only untagged", () => {
    expect(ids(filterComments(comments, marks, { person: "general" }))).toEqual([
      "general-in-j1",
      "general-in-j3",
    ]);
  });

  it("jathi filter keeps comments in that jathi, general included", () => {
    expect(ids(filterComments(comments, marks, { jathi: "j1" }))).toEqual([
      "general-in-j1",
      "me-in-j1",
      "other-in-j1",
    ]);
  });

  it("person and jathi combine", () => {
    expect(ids(filterComments(comments, marks, { person: "me", jathi: "j3" }))).toEqual([
      "general-in-j3",
    ]);
  });
});
