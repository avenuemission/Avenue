"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { leaderFetch } from "@/lib/leaderFetch";
import { getStudyGuides } from "@/lib/content";
import {
  LogOut,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Music,
} from "lucide-react";

interface StudyGuide {
  date: string;
  series: string;
  topic: string;
  text: string;
  spotifyUrl: string;
  pdfUrl: string;
  color: string;
}

export default function StudyGuidesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    
    setUser(currentUser);
    
    // Check leader access
    leaderFetch("/api/leader-access")
      .then((res) => res.json())
      .then((data) => {
        setHasAccess(data.full_access === true);
        setAccessChecked(true);
        if (!data.full_access) {
          router.push("/leaders");
        }
      })
      .catch(() => {
        setAccessChecked(true);
        router.push("/leaders");
      });

    // Load study guides from Supabase
    getStudyGuides()
      .then((loaded) => {
        const guides: StudyGuide[] = loaded.map((g) => ({
          date: g.guide_date,
          series: g.series,
          topic: g.topic,
          text: g.scripture,
          spotifyUrl: g.spotify_url || "",
          pdfUrl: g.pdf_url || "",
          color: g.color || "#3b82f6",
        }));
        setStudyGuides(guides);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading study guides:", err);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const toggleGuide = (index: number) => {
    setExpandedGuide(expandedGuide === index ? null : index);
  };

  // Group guides by series
  const groupedGuides = studyGuides.reduce((acc, guide, index) => {
    if (!acc[guide.series]) {
      acc[guide.series] = { guides: [], color: guide.color };
    }
    acc[guide.series].guides.push({ ...guide, originalIndex: index });
    return acc;
  }, {} as Record<string, { guides: (StudyGuide & { originalIndex: number })[]; color: string }>);

  if (!mounted || !user || !accessChecked || !hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Gradient Background */}

      {/* Header */}
      <header className="relative z-10 border-b border-[var(--border)]">
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
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/leaders"
          className="inline-flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent)] text-sm uppercase tracking-wider mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">
            Weekly Study Guides
          </h1>
          <p className="text-gray-400">
            Resources for each week&apos;s pathway discussion
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading study guides...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedGuides).map(([seriesName, { guides, color }]) => (
              <div key={seriesName} className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h2 className="text-xl font-semibold text-white">{seriesName}</h2>
                </div>

                {guides.map((guide) => (
                  <div
                    key={guide.originalIndex}
                    className="bg-[var(--surface)] rounded-xl border overflow-hidden transition-all"
                    style={{ borderColor: `${color}40` }}
                  >
                    <button
                      onClick={() => toggleGuide(guide.originalIndex)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-2 h-12 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="text-gray-400 text-xs mb-1">{guide.date}</p>
                          <h3 className="text-white font-medium">{guide.topic}</h3>
                          <p className="text-gray-500 text-sm">{guide.text}</p>
                        </div>
                      </div>
                      {expandedGuide === guide.originalIndex ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>

                    {expandedGuide === guide.originalIndex && (
                      <div className="px-4 pb-4 border-t border-[var(--border)]">
                        <div className="mt-4 space-y-3">
                          <div className="p-3 bg-[var(--surface)] rounded-lg">
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                              Bible Text
                            </p>
                            <p className="text-white">{guide.text}</p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {guide.spotifyUrl ? (
                              <a
                                href={guide.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-full text-sm text-green-400 transition-all"
                              >
                                <Music className="w-4 h-4" />
                                Spotify
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full text-sm text-gray-500">
                                <Music className="w-4 h-4" />
                                Spotify - Coming soon!
                              </span>
                            )}

                            {guide.pdfUrl ? (
                              <a
                                href={guide.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/20 hover:brightness-110/30 border border-blue-600/30 rounded-full text-sm text-[var(--accent)] transition-all"
                              >
                                <FileText className="w-4 h-4" />
                                Summary PDF
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full text-sm text-gray-500">
                                <FileText className="w-4 h-4" />
                                PDF - Coming soon!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
