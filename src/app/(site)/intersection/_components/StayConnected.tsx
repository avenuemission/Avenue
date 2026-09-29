"use client";

import { useState } from "react";
import { Instagram, Facebook, Linkedin, Youtube, Calendar } from "lucide-react";
import CalendarPopup from "@/components/site/CalendarPopup";
import Portal from "@/components/ui/Portal";
import { SOCIAL_LINKS } from "@/content/site";

const socialButtons = [
  { name: "Instagram", icon: Instagram, url: SOCIAL_LINKS.instagram },
  { name: "Facebook", icon: Facebook, url: SOCIAL_LINKS.facebook },
  { name: "LinkedIn", icon: Linkedin, url: SOCIAL_LINKS.linkedin },
  { name: "YouTube", icon: Youtube, url: SOCIAL_LINKS.youtube },
];

const buttonClass =
  "btn-night flex items-center justify-center gap-3 px-10 py-8 min-w-[180px]";

// The social links, plus a Google Calendar button that opens the calendar
// popup.
export default function StayConnected() {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-wrap justify-center gap-6 mb-16">
      {socialButtons.map((social) => (
        <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <social.icon size={24} />
          <span className="text-base uppercase tracking-wider">{social.name}</span>
        </a>
      ))}
      <button onClick={() => setCalendarOpen(true)} className={buttonClass}>
        <Calendar size={24} />
        <span className="text-base uppercase tracking-wider">Google Calendar</span>
      </button>

      {calendarOpen && (
        <Portal>
          <CalendarPopup isOpen onClose={() => setCalendarOpen(false)} />
        </Portal>
      )}
    </div>
  );
}
