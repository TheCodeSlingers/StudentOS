/** A small, fixed palette of translucent tints (readable in both light and
 * dark theme) used to give each person a stable, distinct avatar color. */
const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "rgb(34 197 94 / 0.18)", fg: "#16a34a" },
  { bg: "rgb(59 130 246 / 0.18)", fg: "#2563eb" },
  { bg: "rgb(217 119 6 / 0.18)", fg: "#b45309" },
  { bg: "rgb(168 85 247 / 0.18)", fg: "#9333ea" },
  { bg: "rgb(236 72 153 / 0.18)", fg: "#db2777" },
  { bg: "rgb(20 184 166 / 0.18)", fg: "#0d9488" },
];

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").split(" ").filter(Boolean);
  const chars = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return chars.join("") || "?";
}

/** Deterministic — the same seed (e.g. a membershipId) always maps to the
 * same color, so a person's avatar looks the same everywhere they appear. */
export function avatarColor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
