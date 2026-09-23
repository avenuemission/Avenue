"use client";

import { useMemo, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { Metric, Person, Space } from "@/lib/people";

export type PickerTag = { kind: "space"; value: Space } | { kind: "metric"; value: Metric } | { kind: "invitee" };

function hasTag(p: Person, tag: PickerTag): boolean {
  if (tag.kind === "space") return p.spaces.includes(tag.value);
  if (tag.kind === "metric") return p.metrics.includes(tag.value);
  return p.invitee;
}

function tagPatch(p: Person, tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "space") return { spaces: [...p.spaces, tag.value] };
  if (tag.kind === "metric") return { metrics: [...p.metrics, tag.value] };
  return { invitee: true };
}

function tagCreate(tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "space") return { spaces: [tag.value] };
  if (tag.kind === "metric") return { metrics: [tag.value] };
  return { invitee: true };
}

// Type a name: pick someone already on My People to tag them, or add a new
// person with the tag already applied. One person record, many features.
export default function PersonPicker({
  tag,
  people,
  onChange,
}: {
  tag: PickerTag;
  people: Person[];
  onChange: (person: Person) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? people
            .filter((p) => !hasTag(p, tag))
            .filter((p) => `${p.firstName} ${p.lastName ?? ""}`.toLowerCase().includes(q))
            .slice(0, 6)
        : [],
    [people, q, tag]
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

  const [first, ...rest] = query.trim().split(/\s+/);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
                onClick={() => send("PATCH", { id: p.id, ...tagPatch(p, tag) })}
                className="w-full text-left px-3 py-2 text-gray-200 hover:text-white"
              >
                {p.firstName} {p.lastName}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              disabled={busy || !first}
              onClick={() => send("POST", { firstName: first, lastName: rest.join(" ") || null, ...tagCreate(tag) })}
              className="w-full text-left px-3 py-2 text-[var(--accent)]"
            >
              Add &ldquo;{query.trim()}&rdquo; to My People
            </button>
          </li>
        </ul>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
