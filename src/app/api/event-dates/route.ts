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

function getNextEventDate(dates: EventDate[]): Date | null {
  const now = new Date();
  
  for (const eventDate of dates) {
    const parsed = parseDate(eventDate.date);
    if (!parsed) continue;
    
    const { day, month, year } = parsed;
    const [hours, minutes] = eventDate.time.split(":").map(Number);
    
    // Create date in AEDT (UTC+11)
    const eventDateTime = new Date(Date.UTC(year, month - 1, day, hours - 11, minutes));
    
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
