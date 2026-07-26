"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import CountdownTimer from "@/components/CountdownTimer";
import ImageCarousel from "@/components/PathwaysCarousel";
import CalendarPopup from "@/components/CalendarPopup";
import PageTitle from "@/components/ui/PageTitle";
import Reveal from "@/components/ui/Reveal";
import { getIntersectionEvents, IntersectionEvent, IntersectionEventDate } from "@/lib/content";
import { SOCIAL_LINKS } from "@/lib/data";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Calendar,
} from "lucide-react";

interface EventDates {
  prayerAndPraise: Date | null;
}

// Prayer & Praise is a weekly Wednesday 7pm gathering. Compute the next
// occurrence client-side so it always shows a live countdown even when there's
// no explicit date in the database.
function getNextWednesday7pm(): Date {
  const now = new Date();
  const d = new Date(now);
  const daysUntilWed = (3 - d.getDay() + 7) % 7; // 3 = Wednesday
  d.setDate(d.getDate() + daysUntilWed);
  d.setHours(19, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return d;
}

export default function IntersectionPage() {
  const [formData, setFormData] = useState({ name: "", email: "", website: "" });
  const [submitted, setSubmitted] = useState(false);
  const [events, setEvents] = useState<IntersectionEvent[]>([]);
  const [dates, setDates] = useState<IntersectionEventDate[]>([]);
  const [eventDates, setEventDates] = useState<EventDates>({
    prayerAndPraise: null,
  });
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getNextDate = useCallback(
    (key: string) => {
      const now = new Date();
      const eventDates = dates.filter((d) => d.event_key === key);
      for (const d of eventDates) {
        const [hours, minutes] = (d.event_time || "19:00").split(":").map(Number);
        const dt = new Date(d.event_date);
        dt.setHours(hours, minutes, 0, 0);
        if (dt > now) return dt;
      }
      return null;
    },
    [dates]
  );

  const getEventInfo = useCallback(
    (key: string) => events.find((e) => e.key === key),
    [events]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const { events, dates } = await getIntersectionEvents();
        setEvents(events);
        setDates(dates);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    setEventDates({
      prayerAndPraise: getNextDate("prayerAndPraise") ?? getNextWednesday7pm(),
    });
  }, [dates, getNextDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      try {
        // Submit to Netlify Forms
        const netlifyData = new FormData();
        netlifyData.append("form-name", "event-updates");
        netlifyData.append("name", formData.name);
        netlifyData.append("email", formData.email);
        await fetch("/", {
          method: "POST",
          body: netlifyData,
        });

        // Send email notification
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "eventUpdates",
            data: { email: formData.email, website: formData.website },
          }),
        });

        // Save to Supabase (admin dashboard)
        await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            form_type: "event-updates",
            name: formData.name,
            email: formData.email,
            data: { website: formData.website },
          }),
        });
        setSubmitted(true);
        setFormData({ name: "", email: "", website: "" });
        setTimeout(() => setSubmitted(false), 3000);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }
  };

  const socialButtons = [
    {
      name: "Instagram",
      icon: Instagram,
      url: SOCIAL_LINKS.instagram,
      color: "hover:bg-pink-600",
    },
    {
      name: "Facebook",
      icon: Facebook,
      url: SOCIAL_LINKS.facebook,
      color: "hover:bg-blue-600",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: SOCIAL_LINKS.linkedin,
      color: "hover:bg-blue-700",
    },
    {
      name: "YouTube",
      icon: Youtube,
      url: SOCIAL_LINKS.youtube,
      color: "hover:bg-red-600",
    },
    {
      name: "Google Calendar",
      icon: Calendar,
      url: SOCIAL_LINKS.googleCalendar,
      color: "hover:bg-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <PageTitle title="Intersection">
        &ldquo;May the God of endurance and encouragement grant you to live in
        such harmony with one another, in accord with Christ Jesus, that
        together you may with one voice glorify the God and Father of our Lord
        Jesus Christ.&rdquo; – Apostle Paul
      </PageTitle>

      {/* Image Carousel - Scroll-linked */}
      <ImageCarousel folder="intersection_carousel" />

      {/* Intersection Diagram and Description Section */}
      <section className="bg-black pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left - Diagram */}
            <div className="relative flex justify-center lg:justify-start overflow-visible">
              <div
                className="
                  relative
                  h-[450px] md:h-[550px] lg:h-[600px] xl:h-[650px]   /* ⭐ Medium size */
                  w-full overflow-visible
                "
              >
                <Image
                  src="/images/intersection_diagram.png"
                  alt="Intersection Diagram"
                  fill
                  className="
                    object-contain
                    scale-[1.0] md:scale-[1.15] lg:scale-[1.25]      /* ⭐ Less aggressive scaling */
                    lg:-translate-x-12 lg:translate-y-6              /* ⭐ Softer positioning */
                  "
                />
              </div>
            </div>


            {/* Right - Content */}
            <Reveal delay={100} className="space-y-6 lg:pl-8">
              <span className="eyebrow">Where roads meet</span>
              <p className="text-[var(--muted)] md:text-lg leading-relaxed max-w-md">
                As pathway groups gather around Jesus, they occasionally come
                into contact, and during these intersections, we come together to
                worship God in one spirit. We express our worship through
                community, music, prayer, and leisure, creating moments that
                draw us closer to God and to one another. These gatherings take
                many forms, including weekly Prayer and Praise sessions,
                combined pathway events, quarterly sermons, Avenue camps, and a
                variety of other meaningful and fun social activities.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Event Countdown Section */}
      <section className="relative py-16">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/prayer_and_praise.png"
            alt="Prayer and Praise"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10">
          <Reveal className="text-center mb-12">
            <span className="eyebrow mb-4">What&apos;s on</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Event Countdown
            </h2>
          </Reveal>

          <div className="max-w-md mx-auto">
            {/* Prayer & Praise */}
            <Reveal>
              <div className="panel p-6 space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-white uppercase tracking-wider">
                  {getEventInfo("prayerAndPraise")?.title ?? "Prayer & Praise"}
                </h3>
                <p className="text-gray-300 text-sm md:text-base">
                  {getEventInfo("prayerAndPraise")?.description ?? ""}
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">
                    <span className="text-gray-500 uppercase">Location:</span>{" "}
                    {getEventInfo("prayerAndPraise")?.location ?? ""}
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500 uppercase">Time:</span>{" "}
                    {getEventInfo("prayerAndPraise")?.time ?? ""}
                  </p>
                </div>
                <div className="pt-4">
                  {loading || !eventDates.prayerAndPraise ? (
                    <p className="text-gray-400 text-sm">Loading...</p>
                  ) : (
                    <CountdownTimer
                      variant="event"
                      targetDate={eventDates.prayerAndPraise}
                      eventType="weekly"
                    />
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stay in the Loop Section */}
      <section className="relative py-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/lookout.png"
            alt="Lookout"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/75" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 text-center">
          <Reveal className="mb-12">
            <span className="eyebrow mb-4">Stay connected</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white">
              Stay in the Loop
            </h2>
          </Reveal>

          {/* Social Media Buttons */}
          <div className="flex flex-wrap justify-center gap-6 mb-16">
            {socialButtons.map((social) =>
              social.name === "Google Calendar" ? (
                <button
                  key={social.name}
                  onClick={() => setCalendarOpen(true)}
                  className={`flex items-center justify-center gap-3 bg-[var(--accent)] text-white px-10 py-8 rounded-full font-medium transition-all duration-300 hover:brightness-110 min-w-[180px]`}
                >
                  <social.icon size={24} />
                  <span className="text-base uppercase tracking-wider">
                    {social.name}
                  </span>
                </button>
              ) : (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-3 bg-[var(--accent)] text-white px-10 py-8 rounded-full font-medium transition-all duration-300 hover:brightness-110 min-w-[180px]`}
                >
                  <social.icon size={24} />
                  <span className="text-base uppercase tracking-wider">
                    {social.name}
                  </span>
                </a>
              )
            )}
          </div>

          {/* Email Subscription Form */}
          <div className="max-w-lg mx-auto">
            <p className="text-white text-sm md:text-base uppercase tracking-wider mb-8">
              Receive Event Updates via Email
            </p>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              data-netlify="true"
              name="event-updates"
            >
              <input type="hidden" name="form-name" value="event-updates" />
              {/* Honeypot field - hidden from humans, bots will fill it */}
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                tabIndex={-1}
                autoComplete="off"
              />
              <div>
                <label className="block text-gray-400 text-xs md:text-sm mb-2 text-left uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs md:text-sm mb-2 text-left uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-[var(--accent)] text-white px-12 py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm"
              >
                Submit
              </button>
              {submitted && (
                <p className="text-green-400 text-sm">
                  Thank you for subscribing!
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Calendar Popup */}
      <CalendarPopup isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </div>
  );
}
