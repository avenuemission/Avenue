import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY || "";
const CALENDAR_ID = "c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e@group.calendar.google.com";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export async function GET() {
  try {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const timeMin = now.toISOString();
    const timeMax = oneMonthLater.toISOString();

    const baseUrl = "https://www.googleapis.com/calendar/v3/calendars";
    const encodedCalendarId = encodeURIComponent(CALENDAR_ID);
    const url = baseUrl + "/" + encodedCalendarId + "/events?key=" + GOOGLE_API_KEY + "&timeMin=" + timeMin + "&timeMax=" + timeMax + "&singleEvents=true&orderBy=startTime&maxResults=20";

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "Failed to fetch calendar events", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const events: CalendarEvent[] = data.items || [];

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.summary,
      description: event.description || "",
      location: event.location || "",
      startDate: event.start.dateTime || event.start.date,
      endDate: event.end.dateTime || event.end.date,
    }));

    return NextResponse.json({ events: formattedEvents });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
