import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isAdminAuthorized, adminConfigError } from "@/lib/supabaseAdmin";

// GET: public — all site stats
export async function GET() {
  const { data, error } = await supabase.from("site_stats").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stats: data ?? [] });
}

// PUT: admin — update a stat
export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const { key, value, label } = await request.json();
  if (!key || typeof value !== "number") {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("site_stats")
    .upsert({ key, value, label }, { onConflict: "key" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stat: data?.[0] ?? null });
}
