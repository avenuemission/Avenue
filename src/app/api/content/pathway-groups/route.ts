import { NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { serverError } from "@/lib/server/http";

// Public read only. Admin writes live at /api/admin/content/pathway-groups.

// GET (public): list pathway groups
export async function GET() {
  const { data, error } = await supabase
    .from("pathway_groups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return serverError("pathway-groups GET", error);
  return NextResponse.json({ groups: data ?? [] });
}
