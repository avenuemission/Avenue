import { NextRequest, NextResponse } from "next/server";
import { requireLeader } from "@/lib/server/requireLeader";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { serverError } from "@/lib/server/http";

// GET: each pathway group's id and name, for the profile's group picker.
// The public /pathways map reads the groups on the server; admin writes are
// /api/admin/content/pathway-groups.
export async function GET(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("pathway_groups")
    .select("id, name")
    .order("sort_order", { ascending: true });

  if (error) return serverError("content/pathway-groups GET", error);
  return NextResponse.json({ groups: data ?? [] });
}
