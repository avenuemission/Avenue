"use client";

import { useEffect, useRef, useState } from "react";
import { icnuStartText, type Person } from "@/lib/domain/people";
import type { NetworkPerson } from "./Phase5Multiply";

const SAVE_DELAY_MS = 800;

interface IcnuEditorProps {
  networkPerson: NetworkPerson;
  linked: Person | undefined;
  ensurePersonForNetwork: (networkPerson: NetworkPerson) => Promise<Person>;
  patchPerson: (id: string, fields: Record<string, unknown>) => Promise<Person>;
  // Page-lifetime store of the last typed text per networkPersonId (from
  // useMyPeople), so a collapse and reopen starts from the newest text.
  icnuDrafts: Map<string, string>;
}

// Ferguson's ICNU tool ("I see in you...") as a private note against one
// network person, autosaved to My People. If this person has no linked My
// People row yet, the first save creates one (named from the network row)
// and links it via networkPersonId; every save after that patches it.
// ensurePersonForNetwork holds the create lock at the page's useMyPeople
// instance, not here, so a collapse-then-reopen remount of this component
// (its own linkedIdRef reset to null) shares the same in-flight create as
// the unmounting instance's flush, instead of racing a second insert.
export default function IcnuEditor({
  networkPerson,
  linked,
  ensurePersonForNetwork,
  patchPerson,
  icnuDrafts,
}: IcnuEditorProps) {
  // lastSavedRef stays the linked row's note, so a draft newer than it is
  // saved again on the next blur or unmount if the earlier save failed.
  const [text, setText] = useState(() => icnuStartText(icnuDrafts.get(networkPerson.id), linked));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const linkedIdRef = useRef<string | null>(linked?.id ?? null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(linked?.icnu ?? "");
  const textRef = useRef(text);

  const save = async (value: string) => {
    if (value.trim() === lastSavedRef.current.trim()) return;
    setStatus("saving");
    try {
      const id = linkedIdRef.current ?? (await ensurePersonForNetwork(networkPerson)).id;
      linkedIdRef.current = id;
      await patchPerson(id, { icnu: value });
      lastSavedRef.current = value;
      setStatus("saved");
    } catch (e) {
      // linkedIdRef.current is left unset on a failed create, so the next
      // save retries ensurePersonForNetwork rather than getting stuck.
      setStatus("error");
      setErrorMessage((e as Error).message);
    }
  };

  const onChange = (value: string) => {
    setText(value);
    textRef.current = value;
    icnuDrafts.set(networkPerson.id, value);
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
