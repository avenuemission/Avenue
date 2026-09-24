import { NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { serverError } from "@/lib/server/http";

// Public read only. Admin writes live at /api/admin/content/intersection-events.

// GET (public): list all events with their upcoming dates
export async function GET() {
  const [{ data: events, error: eventsError }, { data: dates, error: datesError }] = await Promise.all([
    supabase.from("intersection_events").select("*").order("sort_order", { ascending: true }),
    supabase.from("intersection_event_dates").select("*").order("event_date", { ascending: true }),
  ]);

  if (eventsError || datesError) {
    return serverError("intersection-events GET", eventsError ?? datesError);
  }

  return NextResponse.json({
    events: events ?? [],
    dates: dates ?? [],
  });
}
