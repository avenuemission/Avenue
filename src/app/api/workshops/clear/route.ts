import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireLeader } from "@/lib/requireLeader";

export async function DELETE(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  if (!auth.leader.fullAccess) return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing session code" }, { status: 400 });
  }

  const { error } = await supabase
    .from("survey_responses")
    .delete()
    .eq("session_code", code.toUpperCase());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
