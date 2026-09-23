import { INITIAL_PHASES, Phase } from "./phases";

// Reconciles saved progress (id lists from the database) into a fresh copy of
// INITIAL_PHASES. Ids saved that no longer exist in the content are ignored;
// content with no matching saved id simply stays false.
export function reconcilePhases(
  watchedEpisodes: string[],
  completedModules: string[]
): Phase[] {
  const watchedSet = new Set(watchedEpisodes);
  const completedSet = new Set(completedModules);
  return INITIAL_PHASES.map((phase) => ({
    ...phase,
    modules: phase.modules.map((m) => ({
      ...m,
      completed: completedSet.has(m.id),
      episodes: m.episodes?.map((e) => ({ ...e, watched: watchedSet.has(e.id) })),
    })),
  }));
}

// Extracts the two id lists (watched episode ids, completed module ids)
// that the API contract carries, from a Phase[] tree. Used both to build
// the payload a save sends and, later, to read back whatever is locally
// current when a save conflicts.
export function extractProgressIds(phases: Phase[]): { watchedEpisodes: string[]; completedModules: string[] } {
  const watchedEpisodes = phases.flatMap((phase) =>
    phase.modules.flatMap((m) => (m.episodes ?? []).filter((e) => e.watched).map((e) => e.id))
  );
  const completedModules = phases.flatMap((phase) =>
    phase.modules.filter((m) => m.completed).map((m) => m.id)
  );
  return { watchedEpisodes, completedModules };
}

// Standard three-way merge (base, mine, theirs), used to resolve a 409.
// `base` is the last server state this page's edits are known to be
// relative to (see baseRef below), not the payload a conflicted save
// happened to go out with: comparing against the sent payload instead of
// base was tried first and was wrong, because a tick that IS the sent
// payload's own content is then neither an addition nor a removal relative
// to itself, and survives only by accident if the server happens to already
// have it independently. It usually doesn't, since that is exactly why the
// save conflicted, so that tick would silently die.
//   - localAdds: ids in `local` but not in `base` - added since base, kept
//   - localRemoves: ids in `base` but not in `local` - removed since base
//     (an un-tick), stays removed, not resurrected by the server's copy
//     just because the server doesn't independently know about it
// merged = (server ids, plus localAdds) minus localRemoves.
export function mergeAgainstBase(serverIds: string[], baseIds: string[], localIds: string[]): string[] {
  const baseSet = new Set(baseIds);
  const localSet = new Set(localIds);
  const merged = new Set(serverIds);
  for (const id of localSet) {
    if (!baseSet.has(id)) merged.add(id);
  }
  for (const id of baseSet) {
    if (!localSet.has(id)) merged.delete(id);
  }
  return Array.from(merged);
}
