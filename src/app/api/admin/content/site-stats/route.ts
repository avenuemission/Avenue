import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { siteStatWrite } from "@/lib/domain/adminContent";

// Admin reads and writes for the site stats. The counters show on
// /pathways, which reads them on the server.

// GET: every counter, for the admin editor.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin().from("site_stats").select("key, value, label").order("key");
  if (error) return serverError("admin/content/site-stats GET", error);
  return NextResponse.json({ stats: data ?? [] });
}

// PUT: set a stat's value (and label)
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = siteStatWrite(await request.json().catch(() => null));
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin()
    .from("site_stats")
    .upsert(write.row, { onConflict: "key" })
    .select();

  if (error) return serverError("admin/content/site-stats PUT", error);
  revalidatePath("/pathways");
  return NextResponse.json({ stat: data?.[0] ?? null });
}
