import { NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { serverError } from "@/lib/server/http";
import { STUDY_GUIDE_COLUMNS } from "@/lib/domain/studyGuides";

// Public read only. Admin writes live at /api/admin/content/study-guides.

// GET (public): list all study guides
export async function GET() {
  const { data, error } = await supabase
    .from("study_guides")
    .select(STUDY_GUIDE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) return serverError("study-guides GET", error);
  return NextResponse.json({ guides: data ?? [] });
}
