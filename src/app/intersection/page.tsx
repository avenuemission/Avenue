"use client";

import { useState } from "react";
import Image from "next/image";
import CountdownTimer from "@/components/CountdownTimer";
import { INTERSECTION_EVENTS, SOCIAL_LINKS } from "@/lib/data";
import { saveEmailSubscription } from "@/lib/storage";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Calendar,
} from "lucide-react";

export default function IntersectionPage() {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      saveEmailSubscription(formData.name, formData.email);
      setSubmitted(true);
      setFormData({ name: "", email: "" });
      setTimeout(() => setSubmitted(false), 3000);
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
      {/* Hero Section with Saturn Rings */}
      <section className="relative w-full">
        {/* Saturn Rings Background */}
        <div className="relative h-[500px] md:h-[800px] w-full overflow-hidden">
          <Image
            src="/images/saturn_rings.jpg"
            alt="Saturn rings"
            fill
            className="object-cover opacity-40"
            priority
          />



          {/* Quote overlay on top */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-6 z-10">
            <p className="text-white italic text-center max-w-3xl text-sm md:text-lg drop-shadow-lg">
              &ldquo;May the God of endurance and encouragement grant you to
              live in such harmony with one another, in accord with Christ
              Jesus, that together you may with one voice glorify the God and
              Father of our Lord Jesus Christ.&rdquo; – Apostle Paul
            </p>
          </div>
        </div>
      </section>

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
            <div className="space-y-6 lg:pl-8">
              <h1 className="text-4xl md:text-6xl font-bold text-white">
                INTERSECTION EVENTS
              </h1>

              <p className="text-gray-300 md:text-lg leading-relaxed max-w-md">
                As pathway groups orbit Jesus, they occasionally come into
                contact, and during these intersections, we come together to
                worship God in one spirit. We express our worship through
                community, music, prayer, and leisure, creating moments that
                draw us closer to God and to one another. These gatherings take
                many forms, including weekly Prayer and Praise sessions,
                combined pathway events, quarterly sermons, Avenue camps, and a
                variety of other meaningful and fun social activities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Countdown Section */}
      <section className="bg-gradient-to-b from-blue-950/40 via-blue-900/30 to-blue-950/50 py-16">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-12">
            EVENT COUNTDOWN
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Prayer & Praise */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-6 space-y-4 hover:bg-gray-900/60 transition-colors">
              <h3 className="text-base md:text-lg font-semibold text-white uppercase tracking-wider">
                {INTERSECTION_EVENTS.prayerAndPraise.title}
              </h3>
              <p className="text-gray-300 text-sm md:text-base">
                {INTERSECTION_EVENTS.prayerAndPraise.description}
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">
                  <span className="text-gray-500 uppercase">Location:</span>{" "}
                  {INTERSECTION_EVENTS.prayerAndPraise.location}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500 uppercase">Time:</span>{" "}
                  {INTERSECTION_EVENTS.prayerAndPraise.time}
                </p>
              </div>
              <div className="pt-4">
                <CountdownTimer
                  variant="event"
                  targetDate={INTERSECTION_EVENTS.prayerAndPraise.nextDate}
                  eventType="weekly"
                />
              </div>
            </div>

            {/* Combined Pathways */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-6 space-y-4 hover:bg-gray-900/60 transition-colors">
              <h3 className="text-base md:text-lg font-semibold text-white uppercase tracking-wider">
                {INTERSECTION_EVENTS.combinedPathways.title}
              </h3>
              <p className="text-gray-300 text-sm md:text-base">
                {INTERSECTION_EVENTS.combinedPathways.description}
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">
                  <span className="text-gray-500 uppercase">Location:</span>{" "}
                  {INTERSECTION_EVENTS.combinedPathways.location}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500 uppercase">Time:</span>{" "}
                  {INTERSECTION_EVENTS.combinedPathways.time}
                </p>
              </div>
              <div className="pt-4">
                <CountdownTimer
                  variant="event"
                  targetDate={INTERSECTION_EVENTS.combinedPathways.nextDate}
                  eventType="firstSaturday"
                />
              </div>
            </div>

            {/* Quarterly Sermon */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-6 space-y-4 hover:bg-gray-900/60 transition-colors">
              <h3 className="text-base md:text-lg font-semibold text-white uppercase tracking-wider">
                {INTERSECTION_EVENTS.quarterlySermon.title}
              </h3>
              <p className="text-gray-300 text-sm md:text-base">
                {INTERSECTION_EVENTS.quarterlySermon.description}
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">
                  <span className="text-gray-500 uppercase">Location:</span>{" "}
                  {INTERSECTION_EVENTS.quarterlySermon.location}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500 uppercase">Time:</span>{" "}
                  {INTERSECTION_EVENTS.quarterlySermon.time}
                </p>
              </div>
              <div className="pt-4">
                <CountdownTimer
                  variant="event"
                  targetDate={INTERSECTION_EVENTS.quarterlySermon.nextDate}
                  eventType="quarterly"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stay in the Loop Section */}
      <section className="bg-gradient-to-b from-blue-950/50 via-blue-950/60 to-black py-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-12">
            STAY IN THE LOOP
          </h2>

          {/* Social Media Buttons */}
          <div className="flex flex-wrap justify-center gap-6 mb-16">
            {socialButtons.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-3 bg-blue-800 text-white px-10 py-8 rounded-full font-medium transition-all duration-300 hover:bg-blue-700 min-w-[180px]`}
              >
                <social.icon size={24} />
                <span className="text-base uppercase tracking-wider">
                  {social.name}
                </span>
              </a>
            ))}
          </div>

          {/* Email Subscription Form */}
          <div className="max-w-lg mx-auto">
            <p className="text-white text-sm md:text-base uppercase tracking-wider mb-8">
              Receive Event Updates via Email
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                  className="w-full bg-transparent border-b-2 border-gray-700 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-blue-700 text-white px-12 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm"
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
    </div>
  );
}
