import { NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { serverError } from "@/lib/server/http";

// Public read only. Admin writes live at /api/admin/content/site-stats.

// GET (public): all site stats
export async function GET() {
  const { data, error } = await supabase.from("site_stats").select("*");
  if (error) return serverError("site-stats GET", error);
  return NextResponse.json({ stats: data ?? [] });
}
