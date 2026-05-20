import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all sessions
export async function GET() {
  const { data, error } = await supabase
    .from("workshop_sessions")
    .select("*, survey_responses(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST create a new session
export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Session code required" }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("workshop_sessions")
    .insert({ code: normalized })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Session code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
