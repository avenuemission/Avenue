"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { leaderFetch } from "@/lib/client/leaderFetch";
import type { Person } from "@/lib/domain/people";
import PersonPicker, { untagPatch, type PickerTag } from "./PersonPicker";

// Same rule PersonPicker uses to decide if a person already carries this tag.
function hasTag(p: Person, tag: PickerTag): boolean {
  if (tag.kind === "space") return p.spaces.includes(tag.value);
  if (tag.kind === "metric") return p.metrics.includes(tag.value);
  if (tag.kind === "none") return false;
  return p.invitee;
}

// The people already carrying a tag, as removable chips, with the picker
// below to add more. One list, one add box, reused across spaces, metrics
// and the invitee flag.
export default function TaggedPeople({
  tag,
  people,
  onChange,
  emptyText,
}: {
  tag: PickerTag;
  people: Person[];
  onChange: (person: Person) => void;
  emptyText: string;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tagged = people.filter((p) => hasTag(p, tag));

  const remove = async (p: Person) => {
    setRemovingId(p.id);
    setError(null);
    try {
      const res = await leaderFetch("/api/people", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, ...untagPatch(p, tag) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onChange(data.person as Person);
    } catch (e) {
      setError((e as Error).message);
    }
    setRemovingId(null);
  };

  return (
    <div className="space-y-3">
      {tagged.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tagged.map((p) => {
            const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-3 pr-1 py-1 text-sm text-white"
              >
                {name}
                <button
                  type="button"
                  onClick={() => remove(p)}
                  disabled={removingId === p.id}
                  aria-label={`Remove ${name}`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted)] hover:text-white disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <PersonPicker tag={tag} people={people} onChange={onChange} />
    </div>
  );
}
