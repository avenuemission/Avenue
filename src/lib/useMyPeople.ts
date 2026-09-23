"use client";

import { useCallback, useEffect, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { Person } from "@/lib/people";

function byName(a: Person, b: Person): number {
  return a.firstName.localeCompare(b.firstName);
}

// My People for the signed-in leader: one list shared by Growth, Calling,
// Launch and Multiply. createPerson and patchPerson throw with the API's
// own message so callers can show it.
export function useMyPeople(enabled: boolean) {
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    leaderFetch("/api/people")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load your people (${res.status})`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        setPeople(((body.people ?? []) as Person[]).slice().sort(byName));
        setPeopleLoaded(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setPeopleError(e.message);
        setPeopleLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const upsertPerson = useCallback((person: Person) => {
    setPeople((prev) =>
      prev.some((p) => p.id === person.id)
        ? prev.map((p) => (p.id === person.id ? person : p))
        : [...prev, person].sort(byName)
    );
  }, []);

  const send = useCallback(
    async (method: "POST" | "PATCH", body: Record<string, unknown>): Promise<Person> => {
      const res = await leaderFetch("/api/people", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not save (${res.status})`);
      const person = data.person as Person;
      upsertPerson(person);
      return person;
    },
    [upsertPerson]
  );

  const createPerson = useCallback((fields: Record<string, unknown>) => send("POST", fields), [send]);
  const patchPerson = useCallback((id: string, fields: Record<string, unknown>) => send("PATCH", { id, ...fields }), [send]);

  return { people, peopleLoaded, peopleError, upsertPerson, createPerson, patchPerson };
}
