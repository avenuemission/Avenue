"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/client/auth";
import { leaderFetch } from "@/lib/client/leaderFetch";
import { clearLeaderCache, dedupedLeaderJson } from "@/lib/client/dedupeFetch";
import { useLeaderSession } from "@/hooks/useLeaderSession";
import { apprenticesOnRung as countApprenticesOnRung, greetingFor } from "@/lib/domain/avenue";
import HeaderAvatar from "@/components/leaders/avenue/HeaderAvatar";
import NextStepCard from "@/components/leaders/journey/NextStepCard";
import {
  GraduationCap,
  BookOpen,
  FolderOpen,
  LogOut,
  ExternalLink,
  Calendar,
  Globe,
  Lock,
  ChevronDown,
  ChevronRight,
  Network,
} from "lucide-react";

// Calendar URLs
const AVENUE_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";
const LEADERS_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";

interface DashboardNetwork {
  viewerId?: string | null;
  people?: DashboardNetworkPerson[];
}

interface DashboardNetworkPerson {
  id: string;
  firstName?: string;
  sentOutBy: string | null;
  linkStatus?: string;
  apprenticeStep?: number;
}

export default function LeadersPage() {
  const router = useRouter();
  // Signed in (the layout sends anyone else to /login). The dashboard is
  // open to pending leaders too: full access only unlocks some tools.
  const { user, fullAccess, accessFailure } = useLeaderSession();
  const hasFullAccess = fullAccess === true;
  const accessChecked = fullAccess !== null || accessFailure !== null;
  const [quickOpen, setQuickOpen] = useState(false);
  const [pendingSender, setPendingSender] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [apprenticesOnRung, setApprenticesOnRung] = useState<number | null>(null);
  const [networkFailed, setNetworkFailed] = useState(false);
  const [greetingTime] = useState(() => new Date());

  // One read of the network: the map's Multiply stop, and whether someone
  // has claimed to have sent this person out.
  useEffect(() => {
    if (!user) return;
    dedupedLeaderJson<DashboardNetwork>("/api/network")
      .then((data) => {
        const people: DashboardNetworkPerson[] = data.people ?? [];
        setApprenticesOnRung(countApprenticesOnRung(people, data.viewerId ?? null));
        const me = people.find((p) => p.id === data.viewerId);
        if (!me?.sentOutBy || me.linkStatus === "confirmed") return;
        const sender = people.find((p) => p.id === me.sentOutBy);
        setPendingSender(sender?.firstName ?? "Someone");
      })
      .catch((e) => {
        // The banner is a nicety and must not break the dashboard; the map
        // says plainly that Multiply could not be checked.
        console.error("Dashboard network load failed", e);
        setNetworkFailed(true);
      });
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const answerPending = async (action: "confirm" | "decline") => {
    if (!user) return;
    setConfirming(true);
    setPendingError(null);
    try {
      const res = await leaderFetch("/api/network", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      clearLeaderCache("/api/network");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPendingError(data?.error || "We could not save your answer. Please try again.");
        return;
      }
      setPendingSender(null);
    } catch {
      setPendingError("We could not save your answer. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (!user) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  // Cards that require full_access
  const restrictedCards = ["training", "study", "resources"];

  // The main tools first, then the secondary ones, in one hairline list.
  const tools = [
    { id: "training", title: "Leader Training", icon: GraduationCap, href: "/leaders/training" },
    { id: "network", title: "Discipleship Network", icon: Network, href: "/leaders/network" },
    { id: "study", title: "Weekly Pathways Topics", icon: BookOpen, href: "/leaders/study-guides" },
    { id: "resources", title: "Resources", icon: FolderOpen, href: "/leaders/resources" },
    { id: "admin", title: "Admin", icon: Lock, href: "/leaders/admin" },
  ];

  const isRestricted = (cardId: string) => !hasFullAccess && restrictedCards.includes(cardId);

  const quickLinkClass =
    "flex min-h-[44px] items-center gap-2 px-4 py-2 border border-[var(--line-2)] rounded-full text-sm text-gray-300 hover:text-white";

  return (
    <div className="avenue-night">
      {/* Header */}
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-4xl items-center justify-end px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </button>
            <HeaderAvatar user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
        {/* Greeting (spec 4.4) */}
        <div className="mb-10">
          <p className="eyebrow">Leader dashboard</p>
          <h1 className="mt-2 font-serif text-[34px] leading-[1.05] text-[var(--ink)] md:text-[52px]">
            {greetingFor(greetingTime, user.name)}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Access resources, training, and tools for Avenue leaders</p>
        </div>

        {/* Someone says they sent you out */}
        {pendingSender && (
          <div className="night-card mb-8 p-6">
            <span className="eyebrow">Discipleship Network</span>
            <p className="mt-2 text-[var(--ink)]">{pendingSender} says they sent you out.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => answerPending("confirm")}
                disabled={confirming}
                className="min-h-[44px] rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => answerPending("decline")}
                disabled={confirming}
                className="min-h-[44px] rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Not right
              </button>
            </div>
            {pendingError && <p className="mt-3 text-sm text-[var(--muted)]">{pendingError}</p>}
          </div>
        )}

        {/* Where you are on the avenue, then the one lit card */}
        {accessChecked && hasFullAccess && (
          <div className="mb-12">
            <NextStepCard enabled apprenticesOnRung={apprenticesOnRung} networkFailed={networkFailed} />
          </div>
        )}

        {/* Tools: a quiet hairline list */}
        <nav aria-label="Leader tools">
          <h2 className="night-h2 mb-3">Tools</h2>
          <ul className="border-t border-[var(--line)]">
            {tools.map((card) => (
              <li key={card.id} className="border-b border-[var(--line)]">
                {isRestricted(card.id) ? (
                  <div
                    className="flex min-h-[56px] items-center gap-4 py-3 opacity-60"
                    title="Your access opens after your first call with a pastor"
                  >
                    <card.icon className="h-5 w-5 flex-shrink-0 text-[var(--dim)]" />
                    <span className="flex-1 text-[var(--muted)]">{card.title}</span>
                    <Lock className="h-4 w-4 text-[var(--dim)]" aria-label="Locked" />
                  </div>
                ) : (
                  <Link href={card.href} className="flex min-h-[56px] items-center gap-4 py-3">
                    <card.icon className="h-5 w-5 flex-shrink-0 text-[var(--accent)]" />
                    <span className="flex-1 text-[var(--ink)]">{card.title}</span>
                    <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Pending Access Message */}
        {accessChecked && !hasFullAccess && (
          <p className="mt-6 text-sm italic text-[var(--muted)]">Your access opens after your first call with a pastor.</p>
        )}

        {/* Quick Links: folded away so the page leads with the tools */}
        <div className="mt-8">
          <button
            onClick={() => setQuickOpen((v) => !v)}
            aria-expanded={quickOpen}
            className="flex min-h-[44px] w-full items-center justify-between border-b border-[var(--line)] py-3"
          >
            <span className="text-sm font-medium text-[var(--ink)]">Quick Links</span>
            <ChevronDown className={`h-4 w-4 text-[var(--muted)] ${quickOpen ? "rotate-180" : ""}`} />
          </button>

          {quickOpen && (
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={AVENUE_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="h-4 w-4" />
                Avenue Calendar
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href={LEADERS_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="h-4 w-4" />
                Leaders Calendar
                <ExternalLink className="h-3 w-3" />
              </a>
              <Link href="/" className={quickLinkClass}>
                <Globe className="h-4 w-4" />
                Main Website
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
