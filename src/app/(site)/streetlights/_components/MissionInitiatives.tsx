"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Calendar, Heart, Clock } from "lucide-react";
import Portal from "@/components/ui/Portal";
import Reveal from "@/components/ui/Reveal";
import { useCountdown } from "@/hooks/useCountdown";
import { melbourneInstant } from "@/lib/domain/dates/melbourne";
import { MISSION_INITIATIVES } from "@/content/site";

interface MissionInitiative {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  hasContact?: boolean;
  date?: string;
  image?: string;
  isFeatured?: boolean;
}

// Days to go until a mission starts (midnight, Melbourne).
function MissionCountdown({ date }: { date: string }) {
  const missionCountdown = useCountdown(melbourneInstant(date, 0)) ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return (
    <div className="grid grid-cols-4 gap-3 text-center">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
        <div className="text-2xl md:text-3xl font-bold text-white">{missionCountdown.days}</div>
        <div className="text-xs text-gray-400 uppercase">Days</div>
      </div>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
        <div className="text-2xl md:text-3xl font-bold text-white">{missionCountdown.hours}</div>
        <div className="text-xs text-gray-400 uppercase">Hours</div>
      </div>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
        <div className="text-2xl md:text-3xl font-bold text-white">{missionCountdown.minutes}</div>
        <div className="text-xs text-gray-400 uppercase">Mins</div>
      </div>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
        <div className="text-2xl md:text-3xl font-bold text-white">{missionCountdown.seconds}</div>
        <div className="text-xs text-gray-400 uppercase">Secs</div>
      </div>
    </div>
  );
}

// The Mission Initiatives buttons, each opening its detail modal (the
// Philippines trip has a countdown and a support form).
export default function MissionInitiatives() {
  const [selectedMission, setSelectedMission] = useState<MissionInitiative | null>(null);
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    supportType: "",
    message: "",
    company: "",
  });
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supportForm.name && supportForm.email && supportForm.supportType) {
      try {
        const res = await fetch("/api/forms/mission-support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: supportForm.name,
            email: supportForm.email,
            company: supportForm.company,
            data: { supportType: supportForm.supportType, message: supportForm.message },
          }),
        });
        if (!res.ok) throw new Error(`Form failed (${res.status})`);
        setSupportSubmitted(true);
        setSupportForm({ name: "", email: "", supportType: "", message: "", company: "" });
        setTimeout(() => setSupportSubmitted(false), 3000);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }
  };

  return (
    <>
      <div className="flex flex-wrap justify-center gap-6">
        {MISSION_INITIATIVES.map((initiative, index) => (
          <Reveal key={initiative.id} delay={index * 80}>
            <button
              onClick={() => setSelectedMission(initiative as MissionInitiative)}
              className="bg-[var(--accent)] hover:brightness-110 text-white px-10 py-8 rounded-full font-medium transition-all duration-300 min-w-[200px] flex flex-col items-center justify-center"
            >
              <span className="block text-xl uppercase tracking-wider text-center">
                {initiative.title.split(" ").slice(0, -1).join(" ")}
              </span>
              <span className="block text-sm uppercase tracking-wider mt-1">
                {initiative.title.split(" ").slice(-1)[0]}
              </span>
            </button>
          </Reveal>
        ))}
      </div>

      {/* Mission Initiative Modal */}
      {selectedMission && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedMission(null)}
            />
            <div className="relative z-10 w-full max-w-2xl mx-4 bg-gray-900 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-xl font-semibold text-white">
                  {selectedMission.title}
                </h3>
                <button
                  onClick={() => setSelectedMission(null)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Image for Philippines Mission */}
                {selectedMission.image && (
                  <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
                    <Image
                      src={selectedMission.image}
                      alt={selectedMission.title}
                      fill
                      sizes="(min-width: 768px) 672px, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Countdown for Philippines Mission */}
                {selectedMission.isFeatured && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
                      <Calendar size={20} />
                      <span className="text-sm uppercase tracking-wider">December 2026</span>
                    </div>
                    {selectedMission.date && <MissionCountdown date={selectedMission.date} />}
                  </div>
                )}

                {/* Description */}
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                  {selectedMission.fullDescription}
                </p>

                {/* Technological Stewardship Link */}
                {selectedMission.id === "technological-stewardship" && (
                  <Link
                    href="/technological-stewardship"
                    className="inline-flex items-center gap-2 bg-[var(--accent)] hover:brightness-110 text-white px-6 py-3 rounded-full text-sm font-medium transition-all mb-6"
                  >
                    Take the Survey
                  </Link>
                )}


                {/* Support Form for Philippines Mission */}
                {selectedMission.isFeatured && (
                  <div className="border-t border-gray-800 pt-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Heart size={20} className="text-[var(--accent)]" />
                      Get Involved
                    </h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Support this mission with your time or resources. Fill out the form below and we&apos;ll be in touch.
                    </p>

                    <form onSubmit={handleSupportSubmit} className="space-y-4">
                      {/* Honeypot */}
                      <input
                        type="text"
                        name="company"
                        value={supportForm.company}
                        onChange={(e) => setSupportForm({ ...supportForm, company: e.target.value })}
                        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={supportForm.name}
                            onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={supportForm.email}
                            onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                          How would you like to support? *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSupportForm({ ...supportForm, supportType: "time" })}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                              supportForm.supportType === "time"
                                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            <Clock size={18} />
                            My Time
                          </button>
                          <button
                            type="button"
                            onClick={() => setSupportForm({ ...supportForm, supportType: "resources" })}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                              supportForm.supportType === "resources"
                                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            <Heart size={18} />
                            Resources
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                          Message (Optional)
                        </label>
                        <textarea
                          value={supportForm.message}
                          onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                          rows={3}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                          placeholder="Tell us more about how you'd like to help..."
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[var(--accent)] text-white py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm"
                      >
                        Submit
                      </button>

                      {supportSubmitted && (
                        <p className="text-green-400 text-sm text-center">
                          Thank you! We&apos;ll be in touch soon.
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
