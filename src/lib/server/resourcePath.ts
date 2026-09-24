import "server-only";
import path from "path";

// Resolves a requested resource (which may include subfolders, e.g.
// "music/Chord Charts.pdf") to an absolute path strictly inside root.
// Returns null for anything that is empty, absolute, contains a NUL byte,
// or escapes root. Replaces a path.basename() that silently dropped
// subfolders and made every nested file 404.
export function resolveResourcePath(root: string, requested: string): string | null {
  if (!requested || requested.includes("\0")) return null;
  const normalised = requested.replace(/\\/g, "/");
  if (normalised.startsWith("/") || /^[A-Za-z]:/.test(normalised)) return null;

  const base = path.resolve(root);
  const full = path.resolve(base, ...normalised.split("/"));
  if (full === base || !full.startsWith(base + path.sep)) return null;
  return full;
}
