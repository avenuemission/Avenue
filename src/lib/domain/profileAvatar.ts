// The header avatar's two small rules (round 2 spec 1): the initials shown
// when there is no photo (the same rule ProfileCard has always used), and
// reading the name and photo out of GET /api/leader-profile's body.

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export interface AvatarSummary {
  name: string;
  avatarUrl: string;
}

export function avatarFromProfileResponse(json: unknown, fallbackName: string): AvatarSummary {
  const profile =
    json !== null && typeof json === "object" && "profile" in json ? (json as { profile: unknown }).profile : null;
  const fields: Record<string, unknown> =
    profile !== null && typeof profile === "object" ? (profile as Record<string, unknown>) : {};
  const displayName = typeof fields.display_name === "string" ? fields.display_name.trim() : "";
  return {
    name: displayName || fallbackName,
    avatarUrl: typeof fields.avatar_url === "string" ? fields.avatar_url : "",
  };
}
