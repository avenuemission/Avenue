"use client";

import { useCallback, useState } from "react";
import { Save } from "lucide-react";
import { adminFetch } from "@/lib/client/adminFetch";
import { ErrorText, jsonInit, loadJson, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

interface StatRow {
  key: string;
  value: number;
  label: string | null;
}

const PATH = "/api/admin/content/site-stats";

export default function StatsTab({ adminKey }: AdminTabProps) {
  // Typed values not yet saved, by stat key.
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const save = useAdminSave(adminKey);
  const loadStats = useCallback(
    async () => (await loadJson<{ stats: StatRow[] }>(await adminFetch(PATH, adminKey), "site stats")).stats,
    [adminKey]
  );
  const { data, error, loading, reload } = useLoaded(loadStats);
  const stats = data ?? [];

  const updateStat = (key: string, value: number, label: string | null) => {
    save.run(PATH, jsonInit("PUT", { key, value, label }), () => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      reload();
    });
  };

  return (
    <div>
      <ErrorText message={save.error ?? error} />
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.map((s) => {
            const value = drafts[s.key] ?? s.value;
            return (
              <div key={s.key} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <label className="text-xs text-gray-400 uppercase">{s.label || s.key}</label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setDrafts({ ...drafts, [s.key]: parseInt(e.target.value) || 0 })}
                    className="flex-1 bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => updateStat(s.key, value, s.label)}
                    className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)] text-white"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
