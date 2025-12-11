"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCurrentUser, logout, User } from "@/lib/auth";
import {
  Calendar,
  Target,
  Video,
  BookOpen,
  Music,
  LogOut,
  X,
  ExternalLink,
  CalendarDays,
} from "lucide-react";

// Leaders Calendar URL
const LEADERS_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";

// Dashboard sections data
const UPCOMING_EVENTS = [
  {
    title: "Prayer & Praise",
    date: "Every Wednesday",
    time: "7:00 PM AEDT",
    location: "Mont Albert Church",
  },
  {
    title: "Combined Pathways",
    date: "First Saturday of Month",
    time: "3:00 PM AEDT",
    location: "Mont Albert Church",
  },
  {
    title: "Leaders Meeting",
    date: "Monthly",
    time: "TBA",
    location: "Online",
  },
];

const AVENUE_GOALS = [
  {
    title: "Grow Pathway Communities",
    description: "Expand to 15 pathway groups across Melbourne by end of 2025",
    progress: 47,
  },
  {
    title: "Leader Development",
    description: "Train and equip 20 new pathway leaders",
    progress: 35,
  },
  {
    title: "Community Engagement",
    description: "Reach 500 weekly participants across all programs",
    progress: 60,
  },
];

const VIDEO_TRAINING = [
  {
    title: "Leading a Pathway Group",
    duration: "15 min",
    description: "Fundamentals of facilitating meaningful discussions",
  },
  {
    title: "Pastoral Care Basics",
    duration: "20 min",
    description: "Supporting members through challenges",
  },
  {
    title: "Worship Leading",
    duration: "12 min",
    description: "Creating an atmosphere of praise",
  },
];

const WEEKLY_STUDIES = [
  {
    week: "Week 1",
    title: "The Gospel of John - Introduction",
    passage: "John 1:1-18",
  },
  {
    week: "Week 2",
    title: "The First Sign",
    passage: "John 2:1-12",
  },
  {
    week: "Week 3",
    title: "Born Again",
    passage: "John 3:1-21",
  },
];

const MUSIC_RESOURCES = [
  {
    title: "Homebound Album",
    type: "Original Music",
    link: "https://www.youtube.com/@avenuemission/featured",
  },
  {
    title: "Worship Setlists",
    type: "Song Lists",
    link: "#",
  },
  {
    title: "Chord Charts",
    type: "Resources",
    link: "#",
  },
];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white uppercase tracking-wider">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function LeadersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
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

  const dashboardCards = [
    {
      id: "events",
      title: "Upcoming Events",
      icon: CalendarDays,
      color: "from-purple-600 to-purple-800",
    },
    {
      id: "calendar",
      title: "Leaders Calendar",
      icon: Calendar,
      color: "from-blue-600 to-blue-800",
      isExternal: true,
      link: LEADERS_CALENDAR_URL,
    },
    {
      id: "goals",
      title: "Avenue Goals",
      icon: Target,
      color: "from-green-600 to-green-800",
    },
    {
      id: "training",
      title: "Video Training",
      icon: Video,
      color: "from-red-600 to-red-800",
    },
    {
      id: "study",
      title: "Weekly Study Guide",
      icon: BookOpen,
      color: "from-yellow-600 to-yellow-800",
    },
    {
      id: "music",
      title: "Music Resources",
      icon: Music,
      color: "from-pink-600 to-pink-800",
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-950/20 via-black to-black pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="/images/Avenue.png"
                alt="Avenue"
                width={120}
                height={35}
                className="h-8 w-auto"
              />
              <span className="text-gray-500 text-sm">|</span>
              <span className="text-gray-400 text-sm uppercase tracking-wider">
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
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">
            Leader Dashboard
          </h1>
          <p className="text-gray-400">
            Access resources, training, and tools for Avenue leaders
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                if (card.isExternal && card.link) {
                  window.open(card.link, "_blank");
                } else {
                  setActiveModal(card.id);
                }
              }}
              className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform duration-200 text-left group`}
            >
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <card.icon className="w-16 h-16" />
              </div>
              <card.icon className="w-8 h-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-1">
                {card.title}
              </h3>
              <div className="flex items-center text-white/70 text-sm">
                {card.isExternal ? (
                  <>
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </>
                ) : (
                  <span>Click to view</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-12 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
          <h2 className="text-lg font-semibold text-white uppercase tracking-wider mb-4">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
            >
              Main Website
            </a>
            <a
              href="/pathways"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
            >
              Pathways Page
            </a>
            <a
              href="/intersection"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
            >
              Intersection Page
            </a>
            <a
              href="/streetlights"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
            >
              Streetlights Page
            </a>
          </div>
        </div>
      </main>

      {/* Modals */}
      <Modal
        isOpen={activeModal === "events"}
        onClose={() => setActiveModal(null)}
        title="Upcoming Events"
      >
        <div className="space-y-4">
          {UPCOMING_EVENTS.map((event, index) => (
            <div
              key={index}
              className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
            >
              <h3 className="text-white font-medium mb-2">{event.title}</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>{event.date}</p>
                <p>{event.time}</p>
                <p>{event.location}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === "goals"}
        onClose={() => setActiveModal(null)}
        title="Avenue Goals"
      >
        <div className="space-y-6">
          {AVENUE_GOALS.map((goal, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">{goal.title}</h3>
                <span className="text-blue-400 text-sm">{goal.progress}%</span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{goal.description}</p>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === "training"}
        onClose={() => setActiveModal(null)}
        title="Video Training"
      >
        <div className="space-y-4">
          {VIDEO_TRAINING.map((video, index) => (
            <div
              key={index}
              className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium mb-1">{video.title}</h3>
                  <p className="text-gray-400 text-sm">{video.description}</p>
                </div>
                <span className="text-gray-500 text-xs bg-gray-700 px-2 py-1 rounded">
                  {video.duration}
                </span>
              </div>
            </div>
          ))}
          <p className="text-gray-500 text-sm text-center mt-4">
            More training videos coming soon
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === "study"}
        onClose={() => setActiveModal(null)}
        title="Weekly Study Guide"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm mb-4">
            Current series: The Gospel of John
          </p>
          {WEEKLY_STUDIES.map((study, index) => (
            <div
              key={index}
              className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-400 text-xs uppercase tracking-wider">
                  {study.week}
                </span>
                <span className="text-gray-500 text-xs">{study.passage}</span>
              </div>
              <h3 className="text-white font-medium">{study.title}</h3>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === "music"}
        onClose={() => setActiveModal(null)}
        title="Music Resources"
      >
        <div className="space-y-4">
          {MUSIC_RESOURCES.map((resource, index) => (
            <a
              key={index}
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium mb-1">
                    {resource.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{resource.type}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </div>
            </a>
          ))}
        </div>
      </Modal>
    </div>
  );
}
