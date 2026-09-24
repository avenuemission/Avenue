import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { siteStatWrite } from "@/lib/domain/adminContent";

// Admin writes for the site stats. The public list is GET
// /api/content/site-stats. The counters show on /pathways.

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
