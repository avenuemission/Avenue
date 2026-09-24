"use client";

import { useCallback, useState } from "react";
import { CheckCircle, Lock, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/client/adminFetch";
import { ErrorText, jsonInit, loadJson, useAdminSave, useLoaded, type AdminTabProps } from "./shared";

interface LeaderRow {
  id: string;
  email: string;
  name: string | null;
  full_access: boolean;
  created_at: string;
}

const PATH = "/api/admin/leaders";

export default function LeadersTab({ adminKey }: AdminTabProps) {
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const save = useAdminSave(adminKey);

  const load = useCallback(
    async () => (await loadJson<{ leaders: LeaderRow[] }>(await adminFetch(PATH, adminKey), "leaders")).leaders,
    [adminKey]
  );
  const { data, error, loading, reload } = useLoaded(load);
  const leaders = data ?? [];

  const toggleAccess = (email: string, full_access: boolean) => {
    save.run(PATH, jsonInit("PUT", { email, full_access }), reload);
  };

  const removeLeader = (email: string) => {
    if (!confirm(`Remove leader ${email}?`)) return;
    save.run(`${PATH}?email=${encodeURIComponent(email)}`, { method: "DELETE" }, reload);
  };

  const addLeader = () => {
    if (!newEmail || !newName) return;
    save.run(PATH, jsonInit("POST", { email: newEmail, name: newName }), () => {
      setNewEmail("");
      setNewName("");
      reload();
    });
  };

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New leader name"
          className="bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-sm text-white"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="New leader email"
          className="bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-sm text-white"
        />
        <button
          onClick={addLeader}
          className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Leader
        </button>
      </div>

      <ErrorText message={save.error ?? error} />

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {leaders.map((l) => (
            <div key={l.email} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div>
                <p className="font-medium text-white">{l.name}</p>
                <p className="text-sm text-gray-400">{l.email}</p>
                <p className="text-xs text-gray-500 mt-1">Created {new Date(l.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleAccess(l.email, !l.full_access)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                    l.full_access
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {l.full_access ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Full Access
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Pending
                    </>
                  )}
                </button>
                <button
                  onClick={() => removeLeader(l.email)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {leaders.length === 0 && !error && <p className="text-gray-400 text-center py-12">No leaders yet.</p>}
        </div>
      )}
    </div>
  );
}
