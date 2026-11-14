import { NextRequest, NextResponse } from "next/server";
import { requireLeader } from "@/lib/server/requireLeader";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { serverError } from "@/lib/server/http";
import { melbourneDateOf } from "@/lib/domain/dates/melbourne";
import { yearStories, type HuddleRow } from "@/lib/domain/huddleStories";

// GET /api/huddle-stories: this year's "Stories, not seats" totals for the
// leader dashboard. Any leader, pending included. Numbers only: no names
// are stored anywhere on the site. A handful of rows a year, so the year
// is picked out by yearStories rather than in the query.
export async function GET(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const year = Number(melbourneDateOf(new Date()).slice(0, 4));
  const { data, error } = await getSupabaseAdmin()
    .from("huddle_stories")
    .select("id, label, held_on, pathways, intersections, streetlights");
  if (error) return serverError("huddle-stories GET", error);
  return NextResponse.json(yearStories((data ?? []) as HuddleRow[], year));
}
