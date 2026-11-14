"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/client/adminFetch";
import { STORY_CATEGORIES, type HuddleRow, type StoryKey } from "@/lib/domain/huddleStories";
import { ErrorText, jsonInit, loadJson, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

const PATH = "/api/admin/huddle-stories";

interface Draft {
  label: string;
  heldOn: string;
  pathways: string;
  intersections: string;
  streetlights: string;
}

const EMPTY: Draft = { label: "", heldOn: "", pathways: "0", intersections: "0", streetlights: "0" };

const INPUT = "w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-white";

// The numbers behind the dashboard's "Stories, not seats" card. After each
// Pathway Huddle, add how many people are NEW this year in each category.
// Names stay in the Metrics of Success Google Doc, never here.
export default function HuddleStoriesTab({ adminKey }: AdminTabProps) {
  const save = useAdminSave(adminKey);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const load = useCallback(
    async () => (await loadJson<{ entries: HuddleRow[] }>(await adminFetch(PATH, adminKey), "huddle stories")).entries,
    [adminKey]
  );
  const { data, error, loading, reload } = useLoaded(load);
  const entries = data ?? [];

  const year = new Date().getFullYear();
  const totals = Object.fromEntries(
    STORY_CATEGORIES.map((c) => [c.key, entries.filter((e) => e.held_on.startsWith(`${year}-`)).reduce((n, e) => n + e[c.key], 0)])
  ) as Record<StoryKey, number>;

  const reset = () => {
    setDraft(EMPTY);
    setEditingId(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = {
      label: draft.label,
      heldOn: draft.heldOn,
      pathways: Number(draft.pathways),
      intersections: Number(draft.intersections),
      streetlights: Number(draft.streetlights),
    };
    const path = editingId ? `${PATH}?id=${editingId}` : PATH;
    save.run(path, jsonInit(editingId ? "PUT" : "POST", body), () => {
      reset();
      reload();
    });
  };

  const edit = (row: HuddleRow) => {
    setEditingId(row.id);
    setDraft({
      label: row.label,
      heldOn: row.held_on,
      pathways: String(row.pathways),
      intersections: String(row.intersections),
      streetlights: String(row.streetlights),
    });
  };

  const remove = (row: HuddleRow) => {
    if (!confirm(`Delete "${row.label}" from the ${row.held_on.slice(0, 4)} numbers?`)) return;
    save.run(`${PATH}?id=${row.id}`, { method: "DELETE" }, reload);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-gray-300">
        <p>
          After each Pathway Huddle, add how many people are <strong className="text-white">new this year</strong> in each
          category. Someone already counted this year in a category isn&apos;t counted again there. Only numbers are
          stored; keep the names in the Metrics of Success doc.
        </p>
        <p className="mt-3 text-gray-400">
          {year} so far: {STORY_CATEGORIES.map((c) => `${c.name} ${totals[c.key]}`).join(" · ")}
        </p>
      </div>

      <ErrorText message={save.error ?? error} />

      <form onSubmit={submit} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-4 font-semibold text-white">{editingId ? "Edit huddle" : "Add a huddle"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs uppercase text-gray-400">
            Huddle name
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="e.g. December huddle"
              maxLength={60}
              required
              className={`${INPUT} mt-1 normal-case`}
            />
          </label>
          <label className="block text-xs uppercase text-gray-400">
            Date
            <input
              type="date"
              value={draft.heldOn}
              onChange={(e) => setDraft({ ...draft, heldOn: e.target.value })}
              required
              className={`${INPUT} mt-1`}
            />
          </label>
          {STORY_CATEGORIES.map((c) => (
            <label key={c.key} className="block text-xs uppercase text-gray-400">
              New in {c.name}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                step={1}
                value={draft[c.key]}
                onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
                required
                className={`${INPUT} mt-1`}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button type="submit" className="min-h-[44px] rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white">
            {editingId ? "Save changes" : "Add huddle"}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="min-h-[44px] px-3 text-sm text-gray-400 hover:text-white">
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400">No huddles yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-left text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">Huddle</th>
                <th className="px-4 py-3">Date</th>
                {STORY_CATEGORIES.map((c) => (
                  <th key={c.key} className="px-4 py-3">
                    {c.name}
                  </th>
                ))}
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)] text-white">
                  <td className="px-4 py-2">{row.label}</td>
                  <td className="px-4 py-2 tabular-nums">{row.held_on}</td>
                  {STORY_CATEGORIES.map((c) => (
                    <td key={c.key} className="px-4 py-2 tabular-nums">
                      +{row[c.key]}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button
                      onClick={() => edit(row)}
                      aria-label={`Edit ${row.label}`}
                      className="rounded-lg p-2 text-gray-400 hover:bg-[var(--surface-hover)] hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(row)}
                      aria-label={`Delete ${row.label}`}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
