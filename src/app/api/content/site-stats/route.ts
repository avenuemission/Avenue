import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

// GET (public): all site stats
export async function GET() {
  const { data, error } = await supabase.from("site_stats").select("*");
  if (error) return serverError("site-stats GET", error);
  return NextResponse.json({ stats: data ?? [] });
}

// PUT (admin): update a stat
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const { key, value, label } = await request.json();
  if (!key || typeof value !== "number") {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("site_stats")
    .upsert({ key, value, label }, { onConflict: "key" })
    .select();

  if (error) return serverError("site-stats PUT", error);
  return NextResponse.json({ stat: data?.[0] ?? null });
}
