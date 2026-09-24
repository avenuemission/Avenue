"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { leaderFetch } from "@/lib/leaderFetch";
import { Plus, ChevronRight, Users, Clock, BarChart2, LogOut, Trash2, Monitor } from "lucide-react";
import { logout } from "@/lib/auth";

interface Session {
  code: string;
  created_at: string;
  status: string;
  survey_responses: { count: number }[];
}

export default function WorkshopsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [includeLife3, setIncludeLife3] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    fetchSessions();
  }, [router]);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await leaderFetch("/api/workshops/sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleCreate = async () => {
    setError("");
    if (!newCode.trim()) { setError("Enter a session code"); return; }
    const normalized = newCode.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(normalized)) {
      setError("Code must be letters and numbers only");
      return;
    }
    setCreating(true);
    const res = await leaderFetch("/api/workshops/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: normalized, include_life_3: includeLife3 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create session");
    } else {
      setNewCode("");
      setShowCreate(false);
      fetchSessions();
    }
    setCreating(false);
  };

  const handleClear = async (code: string) => {
    setClearing(true);
    setClearError(null);
    try {
      const res = await leaderFetch(`/api/workshops/clear?code=${code}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setClearError(data.error || "Those responses could not be cleared. Please try again.");
        return;
      }
      setConfirmClear(null);
      fetchSessions();
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Those responses could not be cleared. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const suggestedCode = () => {
    const workshopSessions = sessions.filter(s => s.code.startsWith("WORKSHOP"));
    if (workshopSessions.length === 0) return "WORKSHOP1";
    const nums = workshopSessions
      .map(s => parseInt(s.code.replace("WORKSHOP", ""), 10))
      .filter(n => !isNaN(n));
    return `WORKSHOP${nums.length > 0 ? Math.max(...nums) + 1 : 1}`;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">

      <header className="relative z-10 border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/leaders")}
              className="inline-flex min-h-[44px] items-center text-gray-400 hover:text-white transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
            >
              ← Dashboard
            </button>
            <span className="text-gray-700">|</span>
            <span className="text-white font-semibold">Workshop Sessions</span>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Workshop Sessions</h1>
            <p className="text-gray-400 text-sm">Create a session, share the code with participants, then process results.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/leaders/workshops/display")}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Monitor className="w-4 h-4" />
              Display
            </button>
            <button
              onClick={() => { setShowCreate(true); setNewCode(suggestedCode()); }}
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
        </div>

        {/* Create session panel */}
        {showCreate && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Create New Session</h2>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={newCode}
                  onChange={e => { setNewCode(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. GUINEAPIG"
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors uppercase"
                />
                {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setError(""); }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeLife3}
                  onChange={(e) => setIncludeLife3(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <div>
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">Include Life 3.0 question</span>
                  <p className="text-gray-500 text-xs">Show the Tegmark AGI futures ranking question in Section 5. Disable for groups where this topic may be too complex.</p>
                </div>
              </label>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Letters and numbers only. Participants will type this code at the start of the survey.
            </p>
          </div>
        )}

        {clearError && <p className="text-red-400 text-sm mb-3">{clearError}</p>}

        {/* Sessions list */}
        {loading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
            <BarChart2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No sessions yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => {
              const count = session.survey_responses?.[0]?.count ?? 0;
              const date = new Date(session.created_at).toLocaleDateString("en-AU", {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <div key={session.code} className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl transition-all">
                  {confirmClear === session.code ? (
                    <div className="flex items-center justify-between px-5 py-4 gap-4">
                      <p className="text-red-300 text-sm">
                        Delete all <span className="font-mono font-bold">{count}</span> response{count !== 1 ? "s" : ""} for <span className="font-mono font-bold">{session.code}</span>? This cannot be undone.
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleClear(session.code)}
                          disabled={clearing}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          {clearing ? "Clearing..." : "Yes, clear"}
                        </button>
                        <button
                          onClick={() => setConfirmClear(null)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => router.push(`/leaders/workshops/${session.code}`)}
                        className="flex-1 flex items-center justify-between px-5 py-4 group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[var(--accent)] font-mono font-bold text-lg">{session.code}</span>
                          <div className="flex items-center gap-3 text-gray-500 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {count} {count === 1 ? "response" : "responses"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {date}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              session.status === "active"
                                ? "bg-green-900/40 text-green-400"
                                : "bg-gray-800 text-gray-500"
                            }`}>
                              {session.status}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--accent)] transition-colors" />
                      </button>
                      <button
                        onClick={() => setConfirmClear(session.code)}
                        className="px-4 py-4 text-gray-700 hover:text-red-400 transition-colors border-l border-[var(--border)]"
                        title="Clear responses"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* All sessions combined */}
            <button
              onClick={() => router.push("/leaders/workshops/ALL")}
              className="w-full flex items-center justify-between bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl px-5 py-4 transition-all group mt-6"
            >
              <div className="flex items-center gap-4">
                <span className="text-[var(--accent)] font-semibold text-sm">All Sessions Combined</span>
                <span className="text-gray-500 text-xs">
                  {sessions.reduce((sum, s) => sum + (s.survey_responses?.[0]?.count ?? 0), 0)} total responses
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--accent)] transition-colors" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
