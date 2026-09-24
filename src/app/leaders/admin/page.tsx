"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/client/auth";
import { adminFetch } from "@/lib/client/adminFetch";
import { useAdminKey } from "@/hooks/useAdminKey";
import {
  ArrowLeft,
  BarChart2,
  HeadphonesIcon,
  Lock,
  Users,
  Mail,
  FileText,
  MapPin,
  Calendar,
  BookOpen,
  BarChart3,
  HeartPulse,
} from "lucide-react";
import SubmissionsTab from "./_tabs/SubmissionsTab";
import LeadersTab from "./_tabs/LeadersTab";
import PathwaysTab from "./_tabs/PathwaysTab";
import EventsTab from "./_tabs/EventsTab";
import GuidesTab from "./_tabs/GuidesTab";
import StatsTab from "./_tabs/StatsTab";
import ChurchHealthTab from "./_tabs/ChurchHealthTab";
import EmailPreviewTab from "./_tabs/EmailPreviewTab";

const TABS = [
  { id: "submissions", label: "Form Submissions", icon: FileText },
  { id: "leaders", label: "Leaders & Access", icon: Users },
  { id: "pathways", label: "Pathway Groups", icon: MapPin },
  { id: "events", label: "Intersection Events", icon: Calendar },
  { id: "guides", label: "Study Guides", icon: BookOpen },
  { id: "stats", label: "Site Stats", icon: BarChart3 },
  { id: "health", label: "Church Health", icon: HeartPulse },
  { id: "emails", label: "Email Previews", icon: Mail },
];

const LOCKED_OUT = "Too many attempts. Please wait a few minutes and try again.";

// Checks a passcode against the admin API: 204 is right, 401 wrong, 429
// locked out after too many wrong tries.
async function probe(key: string): Promise<"ok" | "wrong" | "locked" | "error"> {
  const res = await adminFetch("/api/admin/session", key);
  if (res.status === 204) return "ok";
  if (res.status === 401) return "wrong";
  if (res.status === 429) return "locked";
  return "error";
}

export default function AdminPage() {
  const router = useRouter();
  // The stored passcode (sessionStorage "avenue_admin_key") and the one it
  // has been checked as. The admin is in once the two match.
  const { key: storedKey, setKey, clear } = useAdminKey();
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [typedKey, setTypedKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("submissions");
  const authenticated = storedKey !== null && storedKey === verifiedKey;

  useEffect(() => {
    if (!getCurrentUser()) router.push("/login");
  }, [router]);

  // A passcode kept from earlier in this tab is checked again on load.
  useEffect(() => {
    if (storedKey === null || storedKey === verifiedKey) return;
    let cancelled = false;
    probe(storedKey)
      .then((result) => {
        if (cancelled) return;
        if (result === "ok") setVerifiedKey(storedKey);
        else clear();
      })
      .catch((e) => console.error("admin: stored key check failed", e));
    return () => {
      cancelled = true;
    };
  }, [storedKey, verifiedKey, clear]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const key = typedKey.trim();
    if (!key) return;
    probe(key)
      .then((result) => {
        if (result === "ok") {
          setVerifiedKey(key);
          setKey(key);
          setAuthError("");
        } else if (result === "locked") {
          setAuthError(LOCKED_OUT);
        } else if (result === "wrong") {
          setAuthError("Invalid admin key");
        } else {
          setAuthError("Could not verify key");
        }
      })
      .catch(() => setAuthError("Could not verify key"));
  };

  if (!authenticated || storedKey === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <form
          onSubmit={handleAuth}
          className="relative z-10 w-full max-w-md p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">Avenue Admin</h1>
          </div>
          <p className="text-gray-400 text-sm mb-4">Enter the admin key to manage website data and submissions.</p>
          <div className="relative">
            <input
              type="password"
              value={typedKey}
              onChange={(e) => setTypedKey(e.target.value)}
              placeholder="Admin key"
              className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          {authError && <p className="text-red-400 text-sm mt-3">{authError}</p>}
          <button
            type="submit"
            className="w-full mt-4 bg-[var(--accent)] hover:bg-[var(--accent)] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Round 2 spec 5b: the two tools that left the leader dashboard. */}
        <nav aria-label="Admin tools" className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/leaders/support"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)] hover:text-white"
          >
            <HeadphonesIcon className="h-4 w-4" aria-hidden="true" />
            Leader Support
          </Link>
          <Link
            href="/leaders/workshops"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)] hover:text-white"
          >
            <BarChart2 className="h-4 w-4" aria-hidden="true" />
            Workshop Hub
          </Link>
        </nav>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/leaders")} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Hub
            </button>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Avenue Admin</h1>
          </div>
          <button
            onClick={() => {
              clear();
              setVerifiedKey(null);
              setTypedKey("");
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
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-gray-400 hover:bg-[var(--surface-hover)] hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "submissions" && <SubmissionsTab adminKey={storedKey} />}
        {activeTab === "leaders" && <LeadersTab adminKey={storedKey} />}
        {activeTab === "pathways" && <PathwaysTab adminKey={storedKey} />}
        {activeTab === "events" && <EventsTab adminKey={storedKey} />}
        {activeTab === "guides" && <GuidesTab adminKey={storedKey} />}
        {activeTab === "stats" && <StatsTab adminKey={storedKey} />}
        {activeTab === "health" && <ChurchHealthTab adminKey={storedKey} />}
        {activeTab === "emails" && <EmailPreviewTab adminKey={storedKey} />}
      </div>
    </div>
  );
}
