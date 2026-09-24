import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";

export async function GET(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  if (!auth.leader.fullAccess) return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  let query = supabase.from("survey_responses").select("*");
  if (code && code !== "ALL") {
    query = query.eq("session_code", code.toUpperCase());
  }

  const { data, error } = await query;
  if (error) return serverError("workshops/results GET", error);

  return NextResponse.json(data ?? []);
}
