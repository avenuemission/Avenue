"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import Reveal from "@/components/ui/Reveal";
import ProfileCard from "@/components/ui/ProfileCard";
import {
  Video,
  BookOpen,
  HeadphonesIcon,
  FolderOpen,
  LogOut,
  ExternalLink,
  Calendar,
  Globe,
  BarChart2,
  Lock,
} from "lucide-react";

// Calendar URLs
const AVENUE_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";
const LEADERS_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";

export default function LeadersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
      // Check leader access
      fetch(`/api/leader-access?email=${encodeURIComponent(currentUser.email)}`)
        .then((res) => res.json())
        .then((data) => {
          setHasFullAccess(data.full_access === true);
          setAccessChecked(true);
        })
        .catch(() => {
          setAccessChecked(true);
        });
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Cards that require full_access
  const restrictedCards = ["training", "study", "resources"];

  // Featured up top — the dashboard upgrade will land alongside this.
  const primaryCards = [
    { id: "training", title: "Leader Training", icon: Video, href: "/leaders/training" },
  ];

  // Secondary tools, kept in a quieter section below.
  const moreCards = [
    { id: "study", title: "Weekly Pathways Topics", icon: BookOpen, href: "/leaders/study-guides" },
    { id: "support", title: "Leader Support", icon: HeadphonesIcon, href: "/leaders/support" },
    { id: "resources", title: "Resources", icon: FolderOpen, href: "/leaders/resources" },
    { id: "workshops", title: "Workshop Hub", icon: BarChart2, href: "/leaders/workshops" },
    { id: "admin", title: "Admin", icon: Lock, href: "/leaders/admin" },
  ];

  const isRestricted = (cardId: string) => !hasFullAccess && restrictedCards.includes(cardId);

  const quickLinkClass =
    "flex items-center gap-2 px-4 py-2 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] rounded-full text-sm text-gray-300 transition-all";

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <span className="text-white text-lg font-semibold uppercase tracking-wider">
              Leaders Hub
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[var(--muted)] text-sm">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <Reveal className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-2">
            Leader Dashboard
          </h1>
          <p className="text-[var(--muted)]">
            Access resources, training, and tools for Avenue leaders
          </p>
        </Reveal>

        {/* My Profile */}
        <Reveal className="max-w-4xl mx-auto mb-5">
          <ProfileCard email={user.email} fallbackName={user.name} />
        </Reveal>

        {/* Featured */}
        <div className="grid grid-cols-1 gap-5 max-w-4xl mx-auto">
          {primaryCards.map((card, index) => {
            const restricted = isRestricted(card.id);

            if (restricted) {
              return (
                <Reveal key={card.id} delay={index * 60}>
                  <div className="panel p-8 h-full opacity-60 cursor-not-allowed">
                    <card.icon className="w-10 h-10 text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      {card.title}
                    </h3>
                    <div className="flex items-center text-amber-400/80 text-sm font-medium">
                      <span>Pending Authorization</span>
                    </div>
                  </div>
                </Reveal>
              );
            }

            return (
              <Reveal key={card.id} delay={index * 60}>
                <Link
                  href={card.href}
                  className="panel panel-interactive group block p-8 h-full"
                >
                  <card.icon className="w-10 h-10 text-[var(--accent)] mb-4 transition-transform group-hover:scale-110" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {card.title}
                  </h3>
                  <div className="flex items-center text-[var(--muted)] text-sm group-hover:text-white transition-colors">
                    <span>View →</span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

        {/* More Tools — secondary, compact tiles */}
        <Reveal className="mt-10 max-w-4xl mx-auto">
          <div className="border-t border-[var(--border)] pt-8">
            <h2 className="eyebrow mb-4">More Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {moreCards.map((card) => {
                const restricted = isRestricted(card.id);

                if (restricted) {
                  return (
                    <div
                      key={card.id}
                      className="panel flex items-center gap-3 p-4 opacity-50 cursor-not-allowed"
                      title="Pending authorization"
                    >
                      <card.icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-400 truncate">
                        {card.title}
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={card.id}
                    href={card.href}
                    className="panel panel-interactive group flex items-center gap-3 p-4"
                  >
                    <card.icon className="w-5 h-5 text-[var(--accent)] flex-shrink-0 transition-transform group-hover:scale-110" />
                    <span className="text-sm font-medium text-white truncate">
                      {card.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Pending Access Message */}
        {accessChecked && !hasFullAccess && (
          <div className="mt-6 max-w-4xl mx-auto text-center">
            <p className="text-[var(--muted)] text-sm italic">
              Full access to training materials, study guides, and resources will be granted after your first Zoom call with our team.
              Please use the Leader Support section to schedule a meeting — we look forward to connecting with you!
            </p>
          </div>
        )}

        {/* Quick Links */}
        <Reveal className="mt-12 max-w-4xl mx-auto">
          <div className="panel p-6">
            <h2 className="text-lg font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h2>
            <div className="flex flex-wrap gap-3">
              <a href={AVENUE_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="w-4 h-4" />
                Avenue Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href={LEADERS_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="w-4 h-4" />
                Leaders Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href="/" className={quickLinkClass}>
                <Globe className="w-4 h-4" />
                Main Website
              </a>
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
