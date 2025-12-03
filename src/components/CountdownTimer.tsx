"use client";

import { useState, useEffect } from "react";
import { NEXT_INTERSECTION_EVENT } from "@/lib/data";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type EventType = "weekly" | "firstSaturday" | "quarterly" | "default";

interface CountdownTimerProps {
  variant?: "navbar" | "full" | "event";
  targetDate?: Date;
  eventName?: string;
  eventType?: EventType;
}

// Helper function to get next Wednesday at 7pm
const getNextWeeklyEvent = (baseDate: Date): Date => {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 7);
  return next;
};

// Helper function to get first Saturday of next month at 4pm
const getNextFirstSaturday = (): Date => {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  
  if (month > 11) {
    month = 0;
    year++;
  }
  
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const firstSaturday = new Date(year, month, 1 + daysUntilSaturday);
  firstSaturday.setHours(16, 0, 0, 0);
  
  return firstSaturday;
};

// Helper function to get next quarterly Saturday at 4pm
const getNextQuarterlySaturday = (baseDate: Date): Date => {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + 3);
  // Find the nearest Saturday
  const dayOfWeek = next.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  next.setDate(next.getDate() + daysUntilSaturday);
  next.setHours(16, 0, 0, 0);
  return next;
};

export default function CountdownTimer({
  variant = "navbar",
  targetDate,
  eventName,
  eventType = "default",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<Date>(
    targetDate || NEXT_INTERSECTION_EVENT.date
  );

  const name = eventName || NEXT_INTERSECTION_EVENT.name;

  useEffect(() => {
    setMounted(true);

    const calculateTimeLeft = () => {
      const now = new Date();
      let target = currentTarget;
      
      // Check if event has passed and auto-reset based on event type
      if (target.getTime() <= now.getTime()) {
        switch (eventType) {
          case "weekly":
            target = getNextWeeklyEvent(target);
            setCurrentTarget(target);
            break;
          case "firstSaturday":
            target = getNextFirstSaturday();
            setCurrentTarget(target);
            break;
          case "quarterly":
            target = getNextQuarterlySaturday(target);
            setCurrentTarget(target);
            break;
          default:
            // Keep showing zeros
            break;
        }
      }
      
      const difference = target.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [currentTarget, eventType]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (!mounted) {
    return null;
  }

  if (variant === "navbar") {
    return (
      <div className="flex items-center bg-blue-900/80 rounded-full px-4 py-2 space-x-3">
        <span className="text-xs font-medium text-white uppercase tracking-wider">
          Next Intersection
        </span>
        <span className="text-sm font-mono text-white">
          T-{formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:
          {formatNumber(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  if (variant === "event") {
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-500">
          {formatNumber(timeLeft.days)} DAYS
        </div>
        <div className="text-2xl font-bold text-purple-500">
          {formatNumber(timeLeft.hours)} HOURS
        </div>
        <div className="text-2xl font-bold text-purple-500">
          {formatNumber(timeLeft.minutes)} MINS
        </div>
        <div className="text-2xl font-bold text-purple-500">
          {formatNumber(timeLeft.seconds)} SECONDS
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-medium text-gray-400 mb-4">{name}</h3>
      <div className="flex space-x-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {formatNumber(timeLeft.days)}
          </div>
          <div className="text-xs text-gray-500 uppercase">Days</div>
        </div>
        <div className="text-4xl font-bold text-gray-600">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {formatNumber(timeLeft.hours)}
          </div>
          <div className="text-xs text-gray-500 uppercase">Hours</div>
        </div>
        <div className="text-4xl font-bold text-gray-600">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {formatNumber(timeLeft.minutes)}
          </div>
          <div className="text-xs text-gray-500 uppercase">Mins</div>
        </div>
        <div className="text-4xl font-bold text-gray-600">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {formatNumber(timeLeft.seconds)}
          </div>
          <div className="text-xs text-gray-500 uppercase">Secs</div>
        </div>
      </div>
    </div>
  );
}
