"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { Metric, Person, Space } from "@/lib/people";
import { enterChoice, splitName, unsavedHint } from "@/lib/personPicker";

// "none" picks or adds a person without tagging them (the launch team keeps
// its own list of ids in the Launch worksheet).
export type PickerTag =
  | { kind: "space"; value: Space }
  | { kind: "metric"; value: Metric }
  | { kind: "invitee" }
  | { kind: "none" };

function hasTag(p: Person, tag: PickerTag): boolean {
  if (tag.kind === "space") return p.spaces.includes(tag.value);
  if (tag.kind === "metric") return p.metrics.includes(tag.value);
  if (tag.kind === "none") return false;
  return p.invitee;
}

function tagPatch(p: Person, tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "none") return {};
  if (tag.kind === "space") return { spaces: [...p.spaces, tag.value] };
  if (tag.kind === "metric") return { metrics: [...p.metrics, tag.value] };
  return { invitee: true };
}

function tagCreate(tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "none") return {};
  if (tag.kind === "space") return { spaces: [tag.value] };
  if (tag.kind === "metric") return { metrics: [tag.value] };
  return { invitee: true };
}

// The PATCH body that removes this tag from a person, leaving their other tags.
export function untagPatch(p: Person, tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "none") return {};
  if (tag.kind === "space") return { spaces: p.spaces.filter((s) => s !== tag.value) };
  if (tag.kind === "metric") return { metrics: p.metrics.filter((m) => m !== tag.value) };
  return { invitee: false };
}

// Type a name: pick someone already on My People to tag them, or add a new
// person with the tag already applied. One person record, many features.
// Enter does the same as tapping (round 3 spec 5), and a typed name that
// was never saved says so when the field loses focus.
export default function PersonPicker({
  tag,
  people,
  onChange,
  exclude,
}: {
  tag: PickerTag;
  people: Person[];
  onChange: (person: Person) => void;
  exclude?: string[]; // ids never offered as matches
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  // Set while a request started by Enter runs, so a second Enter (or a held
  // key) before the field is disabled cannot add the same person twice.
  const enterBusyRef = useRef(false);
  // Set when Enter sent a request: the field is disabled while it runs and
  // loses focus, so it gets focus back once busy clears (the effect below).
  const refocusRef = useRef(false);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? people
            .filter((p) => !hasTag(p, tag))
            .filter((p) => !exclude?.includes(p.id))
            .filter((p) => `${p.firstName} ${p.lastName ?? ""}`.toLowerCase().includes(q))
            .slice(0, 6)
        : [],
    [people, q, tag, exclude]
  );

  const send = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await leaderFetch("/api/people", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onChange(data.person as Person);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  // Picking someone already on My People: tag them, or with no tag just
  // hand them back without any request.
  const pick = (p: Person): Promise<void> => {
    if (tag.kind === "none") {
      setError(null);
      onChange(p);
      setQuery("");
      return Promise.resolve();
    }
    return send("PATCH", { id: p.id, ...tagPatch(p, tag) });
  };

  const name = splitName(query);
  const add = () =>
    name ? send("POST", { firstName: name.firstName, lastName: name.lastName, ...tagCreate(tag) }) : Promise.resolve();

  // Enter: tag an exact match not yet on this list, clear an exact match
  // already on it, otherwise add the typed name. One request at a time.
  const onEnter = () => {
    if (busy || enterBusyRef.current) return;
    const choice = enterChoice(query, people, (p) => hasTag(p, tag) || (exclude?.includes(p.id) ?? false));
    if (choice.kind === "nothing") return;
    if (choice.kind === "already") {
      setError(null);
      setQuery("");
      return;
    }
    if (choice.kind === "existing" && tag.kind === "none") {
      void pick(choice.person); // no request, so the field keeps focus
      return;
    }
    enterBusyRef.current = true;
    refocusRef.current = true;
    const done = choice.kind === "existing" ? pick(choice.person) : add();
    void done.finally(() => {
      enterBusyRef.current = false;
    });
  };

  // The field is enabled again only after React re-renders with busy false,
  // so focus it here rather than when the request's promise settles.
  useEffect(() => {
    if (busy || !refocusRef.current) return;
    refocusRef.current = false;
    inputRef.current?.focus();
  }, [busy]);

  const hint = busy ? null : unsavedHint(query, focused);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          onEnter();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby={hint ? hintId : undefined}
        placeholder="Type a name"
        disabled={busy}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      {q && (
        <ul className="panel divide-y divide-[var(--border)] text-sm">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void pick(p)}
                className="w-full min-h-[44px] text-left px-3 py-2 text-gray-200 hover:text-white"
              >
                {p.firstName} {p.lastName}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              disabled={busy || !name}
              onClick={() => void add()}
              className="w-full min-h-[44px] text-left px-3 py-2 text-[var(--accent)]"
            >
              Add &ldquo;{query.trim()}&rdquo; to My People
            </button>
          </li>
        </ul>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-[var(--muted)]">
          {hint}
        </p>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
