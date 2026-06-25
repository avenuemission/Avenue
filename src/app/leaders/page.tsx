"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
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

  const dashboardCards = [
    {
      id: "training",
      title: "Leader Training",
      icon: Video,
      href: "/leaders/training",
      color: "from-red-500/20 to-red-600/10",
      borderColor: "hover:border-red-500/30",
      iconColor: "text-red-400",
    },
    {
      id: "study",
      title: "Weekly Pathways Topics",
      icon: BookOpen,
      href: "/leaders/study-guides",
      color: "from-green-500/20 to-green-600/10",
      borderColor: "hover:border-green-500/30",
      iconColor: "text-green-400",
    },
    {
      id: "support",
      title: "Leader Support",
      icon: HeadphonesIcon,
      href: "/leaders/support",
      color: "from-blue-500/20 to-blue-600/10",
      borderColor: "hover:border-blue-500/30",
      iconColor: "text-blue-400",
    },
    {
      id: "resources",
      title: "Resources",
      icon: FolderOpen,
      href: "/leaders/resources",
      color: "from-purple-500/20 to-purple-600/10",
      borderColor: "hover:border-purple-500/30",
      iconColor: "text-purple-400",
    },
    {
      id: "workshops",
      title: "Workshop Hub",
      icon: BarChart2,
      href: "/leaders/workshops",
      color: "from-cyan-500/20 to-cyan-600/10",
      borderColor: "hover:border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
    {
      id: "admin",
      title: "Admin",
      icon: Lock,
      href: "/leaders/admin",
      color: "from-red-500/20 to-red-600/10",
      borderColor: "hover:border-red-500/30",
      iconColor: "text-red-400",
    },
  ];

  const isRestricted = (cardId: string) => !hasFullAccess && restrictedCards.includes(cardId);

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/50 to-black animate-gradient-shift" />
        <div className="absolute inset-0 bg-gradient-to-tl from-purple-900/20 via-transparent to-blue-950/30 animate-gradient-shift-reverse" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slower" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-white text-lg font-semibold uppercase tracking-wider">
                Leaders Hub
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">
                Welcome, {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Isaiah Quote */}
        <div className="text-center mb-12">
          <p className="text-blue-400 text-sm uppercase tracking-wider mb-2">Isaiah 6:8</p>
          <blockquote className="text-xl md:text-2xl text-gray-300 italic max-w-3xl mx-auto">
            &ldquo;Then I heard the voice of the Lord saying, &apos;Whom shall I send?&apos; … And I said, &apos;Here am I. Send me!&apos;&rdquo;
          </blockquote>
        </div>

        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">
            Leader Dashboard
          </h1>
          <p className="text-gray-400">
            Access resources, training, and tools for Avenue leaders
          </p>
        </div>

        {/* Dashboard Grid - Liquid Glass Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {dashboardCards.map((card) => {
            const restricted = isRestricted(card.id);
            
            if (restricted) {
              return (
                <div
                  key={card.id}
                  className="group relative overflow-hidden rounded-2xl p-8 backdrop-blur-xl bg-gradient-to-br from-gray-800/20 to-gray-900/10 border border-white/5 opacity-60 cursor-not-allowed"
                >
                  {/* Glass reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-30" />
                  
                  <div className="relative z-10">
                    <card.icon className="w-10 h-10 text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      {card.title}
                    </h3>
                    <div className="flex items-center text-amber-500/80 text-sm font-medium">
                      <span>Pending Authorization</span>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={card.id}
                href={card.href}
                className={`group relative overflow-hidden rounded-2xl p-8 backdrop-blur-xl bg-gradient-to-br ${card.color} border border-white/10 ${card.borderColor} hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
              >
                {/* Glass reflection effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/5 to-transparent rotate-12 group-hover:rotate-6 transition-transform duration-500" />
                
                <div className="relative z-10">
                  <card.icon className={`w-10 h-10 ${card.iconColor} mb-4 group-hover:text-white transition-colors`} />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {card.title}
                  </h3>
                  <div className="flex items-center text-white/50 text-sm group-hover:text-white/70 transition-colors">
                    <span>View →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pending Access Message */}
        {accessChecked && !hasFullAccess && (
          <div className="mt-6 max-w-4xl mx-auto text-center">
            <p className="text-gray-400 text-sm italic">
              Full access to training materials, study guides, and resources will be granted after your first Zoom call with our team. 
              Please use the Leader Support section to schedule a meeting — we look forward to connecting with you!
            </p>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 p-6 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-white uppercase tracking-wider mb-4">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={AVENUE_CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-sm text-gray-300 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Avenue Calendar
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={LEADERS_CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-sm text-gray-300 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Leaders Calendar
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-sm text-gray-300 transition-all"
            >
              <Globe className="w-4 h-4" />
              Main Website
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
