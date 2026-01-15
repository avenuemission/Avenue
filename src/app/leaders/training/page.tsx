"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import {
  LogOut,
  ArrowLeft,
  Play,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

interface Video {
  title: string;
  youtubeUrl: string;
  duration?: string;
}

interface VideoSeries {
  id: string;
  title: string;
  description: string;
  videos: Video[];
}

const VIDEO_SERIES: VideoSeries[] = [
  {
    id: "dna",
    title: "Avenue DNA",
    description: "Understanding the core identity and values of Avenue Mission",
    videos: [
      {
        title: "Avenue DNA - Introduction",
        youtubeUrl: "https://www.youtube.com/watch?v=6JB7nxD4nCI",
        duration: "15 min",
      },
    ],
  },
  {
    id: "pathways",
    title: "How to: Pathways",
    description: "Learn how to lead and facilitate pathway groups effectively",
    videos: [],
  },
  {
    id: "intersection",
    title: "How to: Intersection",
    description: "Guidelines for running intersection events and gatherings",
    videos: [],
  },
  {
    id: "streetlights",
    title: "How to: Streetlights",
    description: "Creative and mission initiatives training",
    videos: [],
  },
  {
    id: "apologetics",
    title: "Apologetics Guide",
    description: "Equipping leaders to answer tough questions about faith",
    videos: [],
  },
];

export default function TrainingVideosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<string | null>("dna");
  const [hasAccess, setHasAccess] = useState(false);
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
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const toggleSeries = (id: string) => {
    setExpandedSeries(expandedSeries === id ? null : id);
  };

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
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/leaders"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">
            Training Videos
          </h1>
          <p className="text-gray-400">
            Video resources to equip and train Avenue leaders
          </p>
        </div>

        {/* Video Series */}
        <div className="space-y-4">
          {VIDEO_SERIES.map((series) => (
            <div
              key={series.id}
              className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggleSeries(series.id)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {series.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{series.description}</p>
                </div>
                {expandedSeries === series.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSeries === series.id && (
                <div className="px-6 pb-6 border-t border-white/10">
                  {series.videos.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {series.videos.map((video, index) => (
                        <a
                          key={index}
                          href={video.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center group-hover:bg-red-600/30 transition-colors">
                              <Play className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{video.title}</p>
                              {video.duration && (
                                <p className="text-gray-500 text-sm">{video.duration}</p>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 p-6 bg-white/5 rounded-xl border border-white/10 text-center">
                      <p className="text-gray-400">Coming soon!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
