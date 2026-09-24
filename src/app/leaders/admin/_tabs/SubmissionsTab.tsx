"use client";

import { useCallback, useState } from "react";
import { Archive, ArchiveRestore, Search, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/client/adminFetch";
import { ErrorText, jsonInit, loadJson, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

interface Submission {
  id: string;
  form_type: string;
  name: string | null;
  email: string | null;
  data: Record<string, unknown> | null;
  archived: boolean;
  created_at: string;
}

const FORM_TYPES = [
  { value: "all", label: "All Forms" },
  { value: "start-pathway", label: "Start a Pathway" },
  { value: "join-pathway", label: "Join a Pathway" },
  { value: "mission-support", label: "Mission Support" },
  { value: "idea-submission", label: "Idea Submission" },
  { value: "leader-support", label: "Leader Support" },
  { value: "event-updates", label: "Event Updates" },
];

const PATH = "/api/admin/submissions";

export default function SubmissionsTab({ adminKey }: AdminTabProps) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const save = useAdminSave(adminKey);

  const load = useCallback(
    async () =>
      (await loadJson<{ submissions: Submission[] }>(
        await adminFetch(`${PATH}?type=${encodeURIComponent(filter)}`, adminKey),
        "submissions"
      )).submissions,
    [adminKey, filter]
  );
  const { data, error, loading, reload } = useLoaded(load);
  const submissions = data ?? [];

  const toggleArchive = (id: string, archived: boolean) => {
    save.run(PATH, jsonInit("PATCH", { id, archived }), reload);
  };

  const deleteSubmission = (id: string) => {
    if (!confirm("Delete this submission permanently?")) return;
    save.run(`${PATH}?id=${encodeURIComponent(id)}`, { method: "DELETE" }, reload);
  };

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      JSON.stringify(s.data).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search submissions..."
            className="w-full bg-black/30 border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-sm text-white"
        >
          {FORM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorText message={save.error ?? error} />

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border ${s.archived ? "border-[var(--border)] bg-[var(--surface)] opacity-60" : "border-[var(--border)] bg-[var(--surface)]"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      {FORM_TYPES.find((t) => t.value === s.form_type)?.label || s.form_type}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    {s.name && <p><span className="text-gray-500">Name:</span> {s.name}</p>}
                    {s.email && <p><span className="text-gray-500">Email:</span> {s.email}</p>}
                    {Object.entries(s.data || {}).map(([k, v]) => (
                      <p key={k} className="break-words">
                        <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>{" "}
                        {String(v)}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleArchive(s.id, !s.archived)}
                    className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-gray-400 hover:text-white"
                    title={s.archived ? "Unarchive" : "Archive"}
                  >
                    {s.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteSubmission(s.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !error && <p className="text-gray-400 text-center py-12">No submissions found.</p>}
        </div>
      )}
    </div>
  );
}
