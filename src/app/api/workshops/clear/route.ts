import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";

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
    return serverError("workshops/clear DELETE", error);
  }

  return NextResponse.json({ success: true });
}
