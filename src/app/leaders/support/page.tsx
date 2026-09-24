"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/client/auth";
import {
  LogOut,
  ArrowLeft,
  Video,
  Calendar,
  Clock,
  CheckCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import HeaderAvatar from "@/components/leaders/avenue/HeaderAvatar";

// Generate next 3 weeks of Thursdays and Saturdays
function getUpcomingCallDates(): { thursdays: Date[]; saturdays: Date[] } {
  const thursdays: Date[] = [];
  const saturdays: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < 21; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    if (date.getDay() === 4 && thursdays.length < 3) {
      // Thursday
      const thursday = new Date(date);
      thursday.setHours(18, 0, 0, 0);
      if (thursday > today) {
        thursdays.push(thursday);
      }
    }
    if (date.getDay() === 6 && saturdays.length < 3) {
      // Saturday
      const saturday = new Date(date);
      saturday.setHours(14, 0, 0, 0);
      if (saturday > today) {
        saturdays.push(saturday);
      }
    }
  }
  
  return { thursdays, saturdays };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const ZOOM_INFO = {
  link: "https://monash.zoom.us/j/5879274261?pwd=T296WXNGTEpDN20yZWZnb1d0ZFY3UT09",
  meetingId: "587 927 4261",
  passcode: "793139",
};

export default function LeaderSupportPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState({ date: "", time: "", website: "" });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { thursdays, saturdays } = getUpcomingCallDates();

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

  const handleSelectDate = async (date: Date) => {
    setSelectedDate(date);
    setSubmitting(true);

    try {
      // Submit to Netlify Forms
      const netlifyData = new FormData();
      netlifyData.append("form-name", "leader-support");
      netlifyData.append("leaderName", user?.name || "");
      netlifyData.append("leaderEmail", user?.email || "");
      netlifyData.append("selectedDate", `${formatDate(date)} at ${formatTime(date)}`);
      await fetch("/", {
        method: "POST",
        body: netlifyData,
      });

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leaderSupport",
          data: {
            leaderName: user?.name,
            leaderEmail: user?.email,
            selectedDate: date.toISOString(),
            formattedDate: `${formatDate(date)} at ${formatTime(date)}`,
            zoomLink: ZOOM_INFO.link,
            meetingId: ZOOM_INFO.meetingId,
            passcode: ZOOM_INFO.passcode,
          },
        }),
      });

      // Save to Supabase (admin dashboard)
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: "leader-support",
          name: user?.name,
          email: user?.email,
          data: { selectedDate: date.toISOString(), formattedDate: `${formatDate(date)} at ${formatTime(date)}` },
        }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTime.date || !customTime.time) return;

    setSubmitting(true);

    try {
      // Submit to Netlify Forms
      const netlifyData = new FormData();
      netlifyData.append("form-name", "leader-support-custom");
      netlifyData.append("leaderName", user?.name || "");
      netlifyData.append("leaderEmail", user?.email || "");
      netlifyData.append("requestedDate", customTime.date);
      netlifyData.append("requestedTime", customTime.time);
      await fetch("/", {
        method: "POST",
        body: netlifyData,
      });

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leaderSupportCustom",
          data: {
            leaderName: user?.name,
            leaderEmail: user?.email,
            requestedDate: customTime.date,
            requestedTime: customTime.time,
            website: customTime.website,
          },
        }),
      });

      // Save to Supabase (admin dashboard)
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: "leader-support",
          name: user?.name,
          email: user?.email,
          data: { requestedDate: customTime.date, requestedTime: customTime.time, custom: true },
        }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !user) {
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
              <Link
                href="/leaders"
                className="inline-flex min-h-[44px] items-center text-white text-lg font-semibold uppercase tracking-wider transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
              >
                Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden text-gray-400 text-sm sm:inline">
                Welcome, {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
              <HeaderAvatar user={user} />
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
            Leader Support
          </h1>
          <p className="text-gray-400">
            Schedule a support call with the Avenue leadership team
          </p>
        </div>

        {submitted ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-green-500/30 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-gray-400 mb-6">
              You&apos;ll receive a confirmation email with the Zoom details.
            </p>
            
            <div className="bg-[var(--surface)] rounded-xl p-6 text-left max-w-md mx-auto">
              <h3 className="text-white font-medium mb-4">Zoom Meeting Details</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">
                  <span className="text-gray-500">Link:</span>{" "}
                  <a href={ZOOM_INFO.link} className="text-[var(--accent)] hover:underline break-all">
                    Join Meeting
                  </a>
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Meeting ID:</span> {ZOOM_INFO.meetingId}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Passcode:</span> {ZOOM_INFO.passcode}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedDate(null);
                setShowCustomForm(false);
              }}
              className="mt-6 text-[var(--accent)] hover:text-[var(--accent)] text-sm"
            >
              Book another call
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Regular Call Times */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <div className="flex items-center gap-3 mb-6">
                <Video className="w-6 h-6 text-[var(--accent)]" />
                <h2 className="text-xl font-semibold text-white">Weekly Support Calls</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Thursdays */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-400 text-sm">Thursdays at 6:00 PM</p>
                  </div>
                  <div className="space-y-2">
                    {thursdays.map((date, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectDate(date)}
                        disabled={submitting}
                        className="w-full p-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl text-left transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{formatDate(date)}</p>
                            <p className="text-gray-500 text-sm">{formatTime(date)}</p>
                          </div>
                          <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saturdays */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-400 text-sm">Saturdays at 2:00 PM</p>
                  </div>
                  <div className="space-y-2">
                    {saturdays.map((date, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectDate(date)}
                        disabled={submitting}
                        className="w-full p-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl text-left transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{formatDate(date)}</p>
                            <p className="text-gray-500 text-sm">{formatTime(date)}</p>
                          </div>
                          <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Time Request */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white">Can&apos;t make these times?</h2>
                  <p className="text-gray-400 text-sm">Request a custom time</p>
                </div>
                {showCustomForm ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showCustomForm && (
                <form
                  onSubmit={handleCustomSubmit}
                  className="mt-6 space-y-4"
                  data-netlify="true"
                  name="leader-support-custom"
                >
                  <input type="hidden" name="form-name" value="leader-support-custom" />
                  {/* Honeypot field - hidden from humans, bots will fill it */}
                  <input
                    type="text"
                    name="website"
                    value={customTime.website}
                    onChange={(e) => setCustomTime({ ...customTime, website: e.target.value })}
                    style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={customTime.date}
                      onChange={(e) => setCustomTime({ ...customTime, date: e.target.value })}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent)]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={customTime.time}
                      onChange={(e) => setCustomTime({ ...customTime, time: e.target.value })}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent)]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent)] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Request This Time"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
