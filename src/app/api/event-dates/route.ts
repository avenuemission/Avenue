import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type EventType = "prayer_and_praise" | "week_of_worship" | "quarterly_sermon";

interface EventDate {
  date: string;
  time: string;
}

function parseCSV(content: string): EventDate[] {
  const lines = content.trim().split("\n");
  const dates: EventDate[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const [date, time] = lines[i].split(",");
    if (date && time) {
      dates.push({ date: date.trim(), time: time.trim() });
    }
  }
  
  return dates;
}

function parseDate(dateStr: string): { day: number; month: number; year: number } | null {
  // Support both DD/MM/YYYY and YYYY-MM-DD formats
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/").map(Number);
    return { day, month, year };
  } else if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return { day, month, year };
  }
  return null;
}

// Returns the UTC offset in hours for Melbourne (Australia/Melbourne) on a given date.
// AEDT = UTC+11 (DST, first Sun Oct – first Sun Apr)
// AEST = UTC+10 (standard, first Sun Apr – first Sun Oct)
function getMelbourneOffsetHours(year: number, month: number, day: number): number {
  // DST starts: first Sunday of October
  const dstStart = new Date(year, 9, 1); // Oct 1
  dstStart.setDate(1 + (7 - dstStart.getDay()) % 7); // first Sunday

  // DST ends: first Sunday of April
  const dstEnd = new Date(year, 3, 1); // Apr 1
  dstEnd.setDate(1 + (7 - dstEnd.getDay()) % 7); // first Sunday

  const date = new Date(year, month - 1, day);

  // DST is active from first Sun Oct through first Sun Apr of the following year
  // i.e. date >= dstStart OR date < dstEnd (of same year)
  const inDST = date >= dstStart || date < dstEnd;
  return inDST ? 11 : 10;
}

function getNextEventDate(dates: EventDate[]): Date | null {
  const now = new Date();
  
  for (const eventDate of dates) {
    const parsed = parseDate(eventDate.date);
    if (!parsed) continue;
    
    const { day, month, year } = parsed;
    const [hours, minutes] = eventDate.time.split(":").map(Number);
    
    // Create date using DST-aware Melbourne offset
    const offset = getMelbourneOffsetHours(year, month, day);
    const eventDateTime = new Date(Date.UTC(year, month - 1, day, hours - offset, minutes));
    
    if (eventDateTime > now) {
      return eventDateTime;
    }
  }
  
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event") as EventType;
    
    if (!eventType) {
      return NextResponse.json(
        { error: "Event type is required" },
        { status: 400 }
      );
    }
    
    const validEvents: EventType[] = ["prayer_and_praise", "week_of_worship", "quarterly_sermon"];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }
    
    const csvPath = path.join(process.cwd(), "public", "data", `${eventType}.csv`);
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: "Event CSV file not found" },
        { status: 404 }
      );
    }
    
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const dates = parseCSV(csvContent);
    const nextDate = getNextEventDate(dates);
    
    return NextResponse.json({
      eventType,
      allDates: dates,
      nextDate: nextDate ? nextDate.toISOString() : null,
    });
  } catch (error) {
    console.error("Error reading event dates:", error);
    return NextResponse.json(
      { error: "Failed to read event dates" },
      { status: 500 }
    );
  }
}
