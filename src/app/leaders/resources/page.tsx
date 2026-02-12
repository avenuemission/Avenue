"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import {
  LogOut,
  ArrowLeft,
  Music,
  BookOpen,
  GraduationCap,
  ExternalLink,
  FileDown,
  Download,
} from "lucide-react";

const RESOURCES = {
  music: [
    {
      title: "Homebound Album",
      description: "Original worship music by Avenue",
      link: "https://www.youtube.com/@avenuemission/featured",
    },
    {
      title: "Worship Setlists",
      description: "Curated song lists for pathway gatherings",
      link: "",
    },
    {
      title: "Chord Charts",
      description: "Guitar and piano chord sheets",
      link: "",
    },
  ],
  courses: [
    {
      title: "Avenue Discipleship Track",
      description: "Avenue's comprehensive discipleship curriculum",
      link: "https://docs.google.com/document/d/10N3905RihA0cYcA-qilrL7cnqWNVpdxgaT9QEspJ9lM/edit?tab=t.0",
    },
    {
      title: "Discipleship Foundations",
      description: "Core principles of making disciples",
      link: "",
    },
    {
      title: "Leadership Development",
      description: "Growing as a pathway leader",
      link: "",
    },
    {
      title: "Biblical Interpretation",
      description: "How to study and teach the Bible",
      link: "",
    },
  ],
  books: [
    {
      title: "The Forgotten Ways",
      author: "Alan Hirsch",
      description: "Reactivating apostolic movements",
      link: "https://www.amazon.com.au/Forgotten-Ways-Reactivating-Apostolic-Movements/dp/1587433494",
    },
    {
      title: "Organic Church",
      author: "Neil Cole",
      description: "Growing faith where life happens",
      link: "https://www.amazon.com.au/Organic-Church-Growing-Faith-Happens/dp/0787981133",
    },
    {
      title: "The Master Plan of Evangelism",
      author: "Robert Coleman",
      description: "Jesus' strategy for discipleship",
      link: "https://www.amazon.com.au/Master-Plan-Evangelism-Robert-Coleman/dp/080075436X",
    },
  ],
};

interface DownloadableResource {
  name: string;
  size: number;
  modified: string;
  category?: string;
}

export default function ResourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [downloads, setDownloads] = useState<DownloadableResource[]>([]);
  const [musicDownloads, setMusicDownloads] = useState<DownloadableResource[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(true);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    
    setUser(currentUser);
    
    // Check leader access
    fetch(`/api/leader-access?email=${encodeURIComponent(currentUser.email)}`)
      .then((res) => res.json())
      .then((data) => {
        setHasAccess(data.full_access === true);
        setAccessChecked(true);
        if (!data.full_access) {
          router.push("/leaders");
        } else {
          // Fetch all downloadable resources
          fetch(`/api/leader-resources?email=${encodeURIComponent(currentUser.email)}`)
            .then((res) => res.json())
            .then((data) => {
              const allResources = data.resources || [];
              // Separate music files from general downloads
              setMusicDownloads(allResources.filter((r: DownloadableResource) => r.category === "music"));
              setDownloads(allResources.filter((r: DownloadableResource) => r.category !== "music"));
              setLoadingDownloads(false);
            })
            .catch(() => setLoadingDownloads(false));
        }
      })
      .catch(() => {
        setAccessChecked(true);
        router.push("/leaders");
      });
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (filename: string) => {
    if (!user) return;
    window.open(`/api/leader-resources/${encodeURIComponent(filename)}?email=${encodeURIComponent(user.email)}`, "_blank");
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
            Resources
          </h1>
          <p className="text-gray-400">
            Music, courses, and books for Avenue leaders
          </p>
        </div>

        <div className="space-y-8">
          {/* Music Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Music className="w-6 h-6 text-pink-400" />
              <h2 className="text-xl font-semibold text-white">Music</h2>
            </div>
            <div className="grid gap-3">
              {/* External music links */}
              {RESOURCES.music.map((resource, index) => (
                resource.link ? (
                  <a
                    key={`link-${index}`}
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 rounded-xl transition-all group"
                  >
                    <div>
                      <p className="text-white font-medium">{resource.title}</p>
                      <p className="text-gray-500 text-sm">{resource.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />
                  </a>
                ) : null
              ))}
              {/* Downloadable music files */}
              {musicDownloads.map((file, index) => (
                <button
                  key={`download-${index}`}
                  onClick={() => handleDownload(file.name)}
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 rounded-xl transition-all group text-left w-full"
                >
                  <div>
                    <p className="text-white font-medium">{file.name.split("/").pop()}</p>
                    <p className="text-gray-500 text-sm">{formatFileSize(file.size)}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Courses Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Courses</h2>
            </div>
            <div className="grid gap-3">
              {RESOURCES.courses.map((resource, index) => (
                resource.link ? (
                  <a
                    key={index}
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-xl transition-all group"
                  >
                    <div>
                      <p className="text-white font-medium">{resource.title}</p>
                      <p className="text-gray-500 text-sm">{resource.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </a>
                ) : (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div>
                      <p className="text-white font-medium">{resource.title}</p>
                      <p className="text-gray-500 text-sm">{resource.description}</p>
                    </div>
                    <span className="text-gray-600 text-sm">Coming soon!</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Books Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Recommended Books</h2>
            </div>
            <div className="grid gap-3">
              {RESOURCES.books.map((book, index) => (
                book.link ? (
                  <a
                    key={index}
                    href={book.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/30 rounded-xl transition-all group"
                  >
                    <div>
                      <p className="text-white font-medium">{book.title}</p>
                      <p className="text-gray-400 text-sm">by {book.author}</p>
                      <p className="text-gray-500 text-sm">{book.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                  </a>
                ) : (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div>
                      <p className="text-white font-medium">{book.title}</p>
                      <p className="text-gray-400 text-sm">by {book.author}</p>
                      <p className="text-gray-500 text-sm">{book.description}</p>
                    </div>
                    <span className="text-gray-600 text-sm">Coming soon!</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Downloads Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileDown className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Downloads</h2>
            </div>
            {loadingDownloads ? (
              <p className="text-gray-500 text-sm">Loading resources...</p>
            ) : downloads.length === 0 ? (
              <p className="text-gray-500 text-sm">No downloadable resources available yet.</p>
            ) : (
              <div className="grid gap-3">
                {downloads.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => handleDownload(file.name)}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl transition-all group text-left w-full"
                  >
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-gray-500 text-sm">{formatFileSize(file.size)}</p>
                    </div>
                    <Download className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
