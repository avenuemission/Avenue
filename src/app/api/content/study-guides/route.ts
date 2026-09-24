import { NextRequest, NextResponse } from "next/server";
import { requireLeader } from "@/lib/server/requireLeader";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { serverError } from "@/lib/server/http";
import { STUDY_GUIDE_COLUMNS } from "@/lib/domain/studyGuides";

// GET: every study guide, for /leaders/study-guides. The public /pathways
// page reads them on the server; admin writes are /api/admin/content/study-guides.
export async function GET(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .select(STUDY_GUIDE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) return serverError("content/study-guides GET", error);
  return NextResponse.json({ guides: data ?? [] });
}
