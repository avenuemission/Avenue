"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  ArrowLeft,
  Lock,
  Users,
  CheckCircle,
  Mail,
  FileText,
  MapPin,
  Calendar,
  BookOpen,
  BarChart3,
  Trash2,
  Archive,
  ArchiveRestore,
  Plus,
  Save,
  X,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

const TABS = [
  { id: "submissions", label: "Form Submissions", icon: FileText },
  { id: "leaders", label: "Leaders & Access", icon: Users },
  { id: "pathways", label: "Pathway Groups", icon: MapPin },
  { id: "events", label: "Intersection Events", icon: Calendar },
  { id: "guides", label: "Study Guides", icon: BookOpen },
  { id: "stats", label: "Site Stats", icon: BarChart3 },
];

const FORM_TYPES = [
  { value: "all", label: "All Forms" },
  { value: "start-pathway", label: "Start a Pathway" },
  { value: "join-pathway", label: "Join a Pathway" },
  { value: "mission-support", label: "Mission Support" },
  { value: "idea-submission", label: "Idea Submission" },
  { value: "leader-support", label: "Leader Support" },
  { value: "event-updates", label: "Event Updates" },
];

async function apiCall(url: string, options: RequestInit, onSuccess: () => void) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const message = json.error || `${res.status} ${res.statusText}`;
      alert(`Save failed: ${message}`);
      return;
    }
    onSuccess();
  } catch (err) {
    alert(`Save failed: ${err instanceof Error ? err.message : "Network error"}`);
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("submissions");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const saved = sessionStorage.getItem("avenue_admin_key");
    if (saved) {
      setAdminKey(saved);
      fetch("/api/leader-access/admin", {
        headers: { authorization: `Bearer ${saved}` },
      }).then((res) => {
        if (res.ok) {
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem("avenue_admin_key");
        }
      });
    }
  }, [router]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    // Test the key against the admin auth endpoint
    fetch("/api/leader-access/admin", {
      headers: { authorization: `Bearer ${adminKey.trim()}` },
    })
      .then((res) => {
        if (res.ok) {
          sessionStorage.setItem("avenue_admin_key", adminKey.trim());
          setAuthenticated(true);
          setAuthError("");
        } else {
          setAuthError("Invalid admin key");
        }
      })
      .catch(() => setAuthError("Could not verify key"));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/40 to-black" />
        <form
          onSubmit={handleAuth}
          className="relative z-10 w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">Avenue Admin</h1>
          </div>
          <p className="text-gray-400 text-sm mb-4">Enter the admin key to manage website data and submissions.</p>
          <div className="relative">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {authError && <p className="text-red-400 text-sm mt-3">{authError}</p>}
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/30 to-black" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/leaders")} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Hub
            </button>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Avenue Admin</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("avenue_admin_key");
              setAuthenticated(false);
              setAdminKey("");
            }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Lock admin
          </button>
        </header>

        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "submissions" && <SubmissionsTab adminKey={adminKey} />}
        {activeTab === "leaders" && <LeadersTab adminKey={adminKey} />}
        {activeTab === "pathways" && <PathwaysTab adminKey={adminKey} />}
        {activeTab === "events" && <EventsTab adminKey={adminKey} />}
        {activeTab === "guides" && <GuidesTab adminKey={adminKey} />}
        {activeTab === "stats" && <StatsTab adminKey={adminKey} />}
      </div>
    </div>
  );
}

// ============================================================
// SUBMISSIONS TAB
// ============================================================
function SubmissionsTab({ adminKey }: { adminKey: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    fetch(`/api/submissions?type=${filter}`, {
      headers: { authorization: `Bearer ${adminKey}` },
    })
      .then((res) => res.json())
      .then((json) => setSubmissions(json.submissions || []))
      .finally(() => setLoading(false));
  }, [adminKey, filter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const toggleArchive = (id: string, archived: boolean) => {
    apiCall("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify({ id, archived }),
    }, fetchSubmissions);
  };

  const deleteSubmission = (id: string) => {
    if (!confirm("Delete this submission permanently?")) return;
    apiCall(`/api/submissions?id=${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${adminKey}` },
    }, fetchSubmissions);
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
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white"
        >
          {FORM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border ${s.archived ? "border-white/5 bg-white/5 opacity-60" : "border-white/10 bg-white/5"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
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
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
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
          {filtered.length === 0 && <p className="text-gray-400 text-center py-12">No submissions found.</p>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LEADERS TAB
// ============================================================
function LeadersTab({ adminKey }: { adminKey: string }) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const fetchLeaders = useCallback(() => {
    setLoading(true);
    fetch("/api/content/leaders", {
      headers: { authorization: `Bearer ${adminKey}` },
    })
      .then((res) => res.json())
      .then((json) => setLeaders(json.leaders || []))
      .finally(() => setLoading(false));
  }, [adminKey]);

  useEffect(() => {
    fetchLeaders();
  }, [fetchLeaders]);

  const toggleAccess = (email: string, full_access: boolean) => {
    apiCall("/api/content/leaders", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify({ email, full_access }),
    }, fetchLeaders);
  };

  const removeLeader = (email: string) => {
    if (!confirm(`Remove leader ${email}?`)) return;
    apiCall(`/api/content/leaders?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${adminKey}` },
    }, fetchLeaders);
  };

  const addLeader = () => {
    if (!newEmail || !newName) return;
    apiCall("/api/content/leaders", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify({ email: newEmail, name: newName }),
    }, () => {
      setNewEmail("");
      setNewName("");
      fetchLeaders();
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
          className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="New leader email"
          className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white"
        />
        <button
          onClick={addLeader}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Leader
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {leaders.map((l) => (
            <div key={l.email} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
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
          {leaders.length === 0 && <p className="text-gray-400 text-center py-12">No leaders yet.</p>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PATHWAY GROUPS TAB
// ============================================================
function PathwaysTab({ adminKey }: { adminKey: string }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const fetchGroups = useCallback(() => {
    setLoading(true);
    fetch("/api/content/pathway-groups")
      .then((res) => res.json())
      .then((json) => setGroups(json.groups || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const save = () => {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    apiCall("/api/content/pathway-groups", {
      method,
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(editing),
    }, () => {
      setEditing(null);
      fetchGroups();
    });
  };

  const deleteGroup = (id: string) => {
    if (!confirm("Delete this group?")) return;
    apiCall(`/api/content/pathway-groups?id=${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${adminKey}` },
    }, fetchGroups);
  };

  const blankGroup = {
    name: "",
    latitude: 0,
    longitude: 0,
    time: "",
    coordinator: "",
    phone: "",
    running: false,
    description: "",
    sort_order: 0,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Pathway Groups</h2>
        <button
          onClick={() => setEditing(blankGroup)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div>
                <p className="font-medium text-white">{g.name}</p>
                <p className="text-sm text-gray-400">
                  {g.coordinator} · {g.time} · {g.running ? "Running" : "Starting soon"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(g)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => deleteGroup(g.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit Group" : "Add Group"}>
          <div className="grid gap-3">
            {["name", "latitude", "longitude", "time", "coordinator", "phone", "description"].map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 uppercase">{field}</label>
                <input
                  type={field === "latitude" || field === "longitude" ? "number" : "text"}
                  value={(editing as any)[field] ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      [field]: field === "latitude" || field === "longitude" ? parseFloat(e.target.value) || 0 : e.target.value,
                    })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.running}
                onChange={(e) => setEditing({ ...editing, running: e.target.checked })}
                className="rounded border-gray-600"
              />
              Running
            </label>
            <button onClick={save} className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium">
              Save Group
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// EVENTS TAB
// ============================================================
function EventsTab({ adminKey }: { adminKey: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [newDate, setNewDate] = useState<{ event_key: string; event_date: string; event_time: string }>({
    event_key: "",
    event_date: "",
    event_time: "19:00",
  });

  const fetchEvents = useCallback(() => {
    setLoading(true);
    fetch("/api/content/intersection-events")
      .then((res) => res.json())
      .then((json) => {
        setEvents(json.events || []);
        setDates(json.dates || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const saveEvent = () => {
    if (!editingEvent) return;
    apiCall("/api/content/intersection-events", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(editingEvent),
    }, () => {
      setEditingEvent(null);
      fetchEvents();
    });
  };

  const addDate = () => {
    if (!newDate.event_key || !newDate.event_date) return;
    apiCall("/api/content/intersection-events", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(newDate),
    }, () => {
      setNewDate({ event_key: "", event_date: "", event_time: "19:00" });
      fetchEvents();
    });
  };

  const deleteDate = (id: string) => {
    if (!confirm("Delete this date?")) return;
    apiCall(`/api/content/intersection-events?id=${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${adminKey}` },
    }, fetchEvents);
  };

  return (
    <div>
      <div className="grid gap-4 mb-6">
        {events.map((e) => (
          <div key={e.key} className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{e.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{e.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {e.location} · {e.time}
                </p>
              </div>
              <button onClick={() => setEditingEvent(e)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                <Save className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3">
              <p className="text-xs uppercase text-gray-500 mb-2">Upcoming dates</p>
              <div className="flex flex-wrap gap-2">
                {dates
                  .filter((d) => d.event_key === e.key)
                  .map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs"
                    >
                      {d.event_date} @ {d.event_time}
                      <button onClick={() => deleteDate(d.id)} className="text-gray-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold mb-3">Add Event Date</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <select
            value={newDate.event_key}
            onChange={(e) => setNewDate({ ...newDate, event_key: e.target.value })}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Select event</option>
            {events.map((e) => (
              <option key={e.key} value={e.key}>
                {e.title}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newDate.event_date}
            onChange={(e) => setNewDate({ ...newDate, event_date: e.target.value })}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="time"
            value={newDate.event_time}
            onChange={(e) => setNewDate({ ...newDate, event_time: e.target.value })}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          onClick={addDate}
          className="mt-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Date
        </button>
      </div>

      {editingEvent && (
        <Modal onClose={() => setEditingEvent(null)} title="Edit Event">
          <div className="grid gap-3">
            {["title", "description", "location", "time"].map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 uppercase">{field}</label>
                <input
                  type="text"
                  value={(editingEvent as any)[field] ?? ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, [field]: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
            <button onClick={saveEvent} className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium">
              Save Event
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// STUDY GUIDES TAB
// ============================================================
function GuidesTab({ adminKey }: { adminKey: string }) {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const fetchGuides = useCallback(() => {
    setLoading(true);
    fetch("/api/content/study-guides")
      .then((res) => res.json())
      .then((json) => setGuides(json.guides || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const save = () => {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    apiCall("/api/content/study-guides", {
      method,
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(editing),
    }, () => {
      setEditing(null);
      fetchGuides();
    });
  };

  const deleteGuide = (id: string) => {
    if (!confirm("Delete this guide?")) return;
    apiCall(`/api/content/study-guides?id=${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${adminKey}` },
    }, fetchGuides);
  };

  const blankGuide = {
    guide_date: "",
    series: "",
    topic: "",
    scripture: "",
    spotify_url: "",
    pdf_url: "",
    color: "#3b82f6",
    sort_order: 0,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Study Guides</h2>
        <button
          onClick={() => setEditing(blankGuide)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Guide
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {guides.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || "#3b82f6" }} />
                <div>
                  <p className="font-medium text-white">{g.topic}</p>
                  <p className="text-sm text-gray-400">
                    {g.series} · {g.guide_date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(g)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => deleteGuide(g.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit Guide" : "Add Guide"}>
          <div className="grid gap-3">
            {[
              { key: "guide_date", label: "Date" },
              { key: "series", label: "Series" },
              { key: "topic", label: "Topic" },
              { key: "scripture", label: "Scripture" },
              { key: "spotify_url", label: "Spotify URL" },
              { key: "pdf_url", label: "PDF URL" },
              { key: "color", label: "Color" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 uppercase">{label}</label>
                <input
                  type="text"
                  value={(editing as any)[key] ?? ""}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
            <button onClick={save} className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium">
              Save Guide
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// STATS TAB
// ============================================================
function StatsTab({ adminKey }: { adminKey: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    setLoading(true);
    fetch("/api/content/site-stats")
      .then((res) => res.json())
      .then((json) => setStats(json.stats || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const updateStat = (key: string, value: number, label: string) => {
    apiCall("/api/content/site-stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${adminKey}` },
      body: JSON.stringify({ key, value, label }),
    }, fetchStats);
  };

  return (
    <div>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.key} className="p-4 rounded-xl border border-white/10 bg-white/5">
              <label className="text-xs text-gray-400 uppercase">{s.label || s.key}</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  value={s.value}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setStats(stats.map((st) => (st.key === s.key ? { ...st, value } : st)));
                  }}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
                <button
                  onClick={() => updateStat(s.key, s.value, s.label)}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL
// ============================================================
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl border border-white/10 bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
