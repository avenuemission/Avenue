import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isAdminAuthorized } from "@/lib/supabaseAdmin";

// GET: public — list all events with their upcoming dates
export async function GET() {
  const [{ data: events, error: eventsError }, { data: dates, error: datesError }] = await Promise.all([
    supabase.from("intersection_events").select("*").order("sort_order", { ascending: true }),
    supabase.from("intersection_event_dates").select("*").order("event_date", { ascending: true }),
  ]);

  if (eventsError || datesError) {
    return NextResponse.json({ error: eventsError?.message || datesError?.message }, { status: 500 });
  }

  return NextResponse.json({
    events: events ?? [],
    dates: dates ?? [],
  });
}

// PUT: admin — update event info
export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { key, ...fields } = body;
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("intersection_events")
    .update(fields)
    .eq("key", key)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No matching event found" }, { status: 404 });
  return NextResponse.json({ event: data[0] });
}

// POST: admin — add a date to an event
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { event_key, event_date, event_time } = await request.json();
  if (!event_key || !event_date) {
    return NextResponse.json({ error: "event_key and event_date required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("intersection_event_dates")
    .insert({ event_key, event_date, event_time: event_time ?? "19:00" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ date: data?.[0] ?? null });
}

// DELETE: admin — remove a date
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("intersection_event_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
