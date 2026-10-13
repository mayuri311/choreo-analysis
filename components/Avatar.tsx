import type { Profile } from "@/lib/types";

export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  profile,
  size = 24,
  className = "",
}: {
  profile: Pick<Profile, "display_name" | "color">;
  size?: number;
  className?: string;
}) {
  return (
    <span
      title={profile.display_name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${className}`}
      style={{ width: size, height: size, background: profile.color, fontSize: size * 0.42 }}
    >
      {initials(profile.display_name)}
    </span>
  );
}
