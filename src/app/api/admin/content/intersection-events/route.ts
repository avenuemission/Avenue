import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { intersectionDateWrite, intersectionEventWrite, isUuid } from "@/lib/domain/adminContent";

// Admin reads and writes for Intersection events and their dates. Both
// show on /intersection, which reads them on the server.
function refresh(): void {
  revalidatePath("/intersection");
}

// GET: the events and all their dates, for the admin editor.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const db = getSupabaseAdmin();
  const [events, dates] = await Promise.all([
    db.from("intersection_events").select("key, title, description, location, time, sort_order").order("sort_order", { ascending: true }),
    db.from("intersection_event_dates").select("id, event_key, event_date, event_time").order("event_date", { ascending: true }),
  ]);
  if (events.error || dates.error) return serverError("admin/content/intersection-events GET", events.error ?? dates.error);
  return NextResponse.json({ events: events.data ?? [], dates: dates.data ?? [] });
}

// PUT: update an event's text by key
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = intersectionEventWrite(await request.json().catch(() => null));
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin()
    .from("intersection_events")
    .update(write.row)
    .eq("key", write.key)
    .select();

  if (error) return serverError("admin/content/intersection-events PUT", error);
  if (!data || data.length === 0) return jsonError(404, "No matching event found");
  refresh();
  return NextResponse.json({ event: data[0] });
}

// POST: add a date to an event
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = intersectionDateWrite(await request.json().catch(() => null));
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin().from("intersection_event_dates").insert(write.row).select();
  if (error?.code === "23505") return jsonError(409, "That event already has this date");
  if (error?.code === "23503") return jsonError(400, "No matching event found");
  if (error) return serverError("admin/content/intersection-events POST", error);
  refresh();
  return NextResponse.json({ date: data?.[0] ?? null });
}

// DELETE ?id=: remove a date
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");

  const { error } = await getSupabaseAdmin().from("intersection_event_dates").delete().eq("id", id);
  if (error) return serverError("admin/content/intersection-events DELETE", error);
  refresh();
  return NextResponse.json({ success: true });
}
