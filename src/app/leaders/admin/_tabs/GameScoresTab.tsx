"use client";

import { useCallback } from "react";
import { Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/client/adminFetch";
import { ErrorText, loadJson, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

interface ScoreRow {
  id: string;
  initials: string;
  score: number;
  duration_ms: number;
  created_at: string;
}

const PATH = "/api/admin/crossing-scores";

// The Cross the Avenue leaderboard on /vision. The public board shows the
// first 10 rows; deleting one lets the next score move up.
export default function GameScoresTab({ adminKey }: AdminTabProps) {
  const save = useAdminSave(adminKey);
  const loadScores = useCallback(
    async () => (await loadJson<{ scores: ScoreRow[] }>(await adminFetch(PATH, adminKey), "game scores")).scores,
    [adminKey]
  );
  const { data, error, loading, reload } = useLoaded(loadScores);
  const scores = data ?? [];

  const deleteScore = (row: ScoreRow) => {
    if (!confirm(`Delete ${row.initials} (${row.score}) from the leaderboard?`)) return;
    save.run(`${PATH}?id=${row.id}`, { method: "DELETE" }, reload);
  };

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Scores from the Cross the Avenue game on the Vision page, highest first. The top 10 show publicly. Delete rude
        initials or a score that looks impossible.
      </p>
      <ErrorText message={save.error ?? error} />
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : scores.length === 0 ? (
        <p className="text-gray-400">No scores yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-left text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Initials</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Game length</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.map((row, i) => (
                <tr key={row.id} className={`border-t border-[var(--border)] ${i < 10 ? "text-white" : "text-gray-400"}`}>
                  <td className="px-4 py-2 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2 font-mono font-semibold tracking-widest">{row.initials}</td>
                  <td className="px-4 py-2 tabular-nums">{row.score}</td>
                  <td className="px-4 py-2 tabular-nums">{Math.round(row.duration_ms / 1000)}s</td>
                  <td className="px-4 py-2">{new Date(row.created_at).toLocaleString("en-AU")}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteScore(row)}
                      aria-label={`Delete ${row.initials} ${row.score}`}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
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
