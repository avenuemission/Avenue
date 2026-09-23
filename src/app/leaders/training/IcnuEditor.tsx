"use client";

import { useEffect, useRef, useState } from "react";
import type { Person } from "@/lib/people";
import type { NetworkPerson } from "./Phase5Multiply";

const SAVE_DELAY_MS = 800;

interface IcnuEditorProps {
  networkPerson: NetworkPerson;
  linked: Person | undefined;
  createPerson: (fields: Record<string, unknown>) => Promise<Person>;
  patchPerson: (id: string, fields: Record<string, unknown>) => Promise<Person>;
}

// Ferguson's ICNU tool ("I see in you...") as a private note against one
// network person, autosaved to My People. If this person has no linked My
// People row yet, the first save creates one (named from the network row)
// and links it via networkPersonId; every save after that patches it.
export default function IcnuEditor({ networkPerson, linked, createPerson, patchPerson }: IcnuEditorProps) {
  const [text, setText] = useState(linked?.icnu ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const linkedIdRef = useRef<string | null>(linked?.id ?? null);
  const creatingRef = useRef<Promise<Person> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(linked?.icnu ?? "");
  const textRef = useRef(text);

  const save = async (value: string) => {
    if (value.trim() === lastSavedRef.current.trim()) return;
    setStatus("saving");
    try {
      if (linkedIdRef.current) {
        await patchPerson(linkedIdRef.current, { icnu: value });
      } else if (creatingRef.current) {
        const created = await creatingRef.current;
        await patchPerson(created.id, { icnu: value });
      } else {
        const promise = createPerson({
          firstName: networkPerson.firstName,
          lastName: networkPerson.lastName,
          networkPersonId: networkPerson.id,
          icnu: value,
        });
        creatingRef.current = promise;
        const created = await promise;
        linkedIdRef.current = created.id;
        creatingRef.current = null;
      }
      lastSavedRef.current = value;
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setErrorMessage((e as Error).message);
    }
  };

  const onChange = (value: string) => {
    setText(value);
    textRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save(value);
    }, SAVE_DELAY_MS);
  };

  const onBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void save(text);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (textRef.current.trim() !== lastSavedRef.current.trim()) {
        void save(textRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <label className="text-sm text-white block mb-1">What I see in you</label>
      <p className="text-xs text-[var(--muted)] mb-1.5">
        Private to you. Finish the sentence: I see in you...
      </p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        maxLength={2000}
        placeholder="I see in you..."
        className="w-full rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] p-3 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
      />
      {status === "saving" && <p className="text-xs text-[var(--muted)] mt-1">Saving...</p>}
      {status === "saved" && <p className="text-xs text-[var(--muted)] mt-1">Saved</p>}
      {status === "error" && <p className="text-xs text-red-400 mt-1">{errorMessage}</p>}
    </div>
  );
}
