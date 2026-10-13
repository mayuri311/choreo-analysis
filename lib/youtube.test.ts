import { describe, expect, it } from "vitest";
import { formatTime, parseTime, parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc&t=10`,
    `youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}?feature=share`,
  ])("parses %s", (url) => {
    expect(parseYouTubeId(url)).toBe(id);
  });

  it.each(["", "hello", "https://vimeo.com/123", "https://youtube.com/watch?v=short"])(
    "rejects %s",
    (url) => {
      expect(parseYouTubeId(url)).toBeNull();
    },
  );
});

describe("time helpers", () => {
  it("formats", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(83.9)).toBe("1:23");
    expect(formatTime(3725)).toBe("1:02:05");
  });
  it("parses", () => {
    expect(parseTime("1:23")).toBe(83);
    expect(parseTime("1:02:05")).toBe(3725);
    expect(parseTime("83")).toBe(83);
    expect(parseTime("1:x")).toBeNull();
  });
});
