"use client";

import { useState, useEffect } from "react";
import { X, Calendar, MapPin, Clock } from "lucide-react";
import { SOCIAL_LINKS } from "@/content/site";
import { formatEventDay, formatTime as formatClock } from "@/lib/domain/dates/format";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarPopup({ isOpen, onClose }: CalendarPopupProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calendar-events");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch events");
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
      setError("Unable to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  // An all-day event's start is a bare YYYY-MM-DD date; a timed one is an
  // instant, shown in Melbourne time.
  const isAllDay = (dateString: string) => dateString.length === 10;
  const formatDate = (dateString: string) => formatEventDay(isAllDay(dateString) ? dateString : new Date(dateString));
  const formatTime = (dateString: string) => (isAllDay(dateString) ? "All day" : formatClock(new Date(dateString)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-gray-400">{error}</p>
              <button
                onClick={fetchEvents}
                className="mt-4 text-blue-500 hover:text-blue-400 text-sm"
              >
                Try again
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No upcoming events in the next month</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-800 transition-colors"
                >
                  <h3 className="font-semibold text-white mb-2">{event.title}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>
                        {formatDate(event.startDate)} • {formatTime(event.startDate)}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-2 text-gray-500 text-sm line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <a
            href={SOCIAL_LINKS.googleCalendar}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-700 text-white text-center py-3 rounded-full font-medium hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm"
          >
            See All Events
          </a>
        </div>
      </div>
    </div>
  );
}
