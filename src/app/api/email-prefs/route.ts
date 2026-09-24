import { NextRequest, NextResponse } from "next/server";
import { adminConfigError, getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireLeader } from "@/lib/requireLeader";
import { emailTablesError, PREFS_COLUMNS, prefsFromRow, validatePrefsPatch, type PrefsRow } from "@/lib/emails/prefs";

// The signed-in leader's own email settings (spec 3.4). The email is only
// ever auth.leader.email, never the body or the query. A missing row
// means every email is on.

// GET /api/email-prefs
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leader_email_prefs")
    .select(PREFS_COLUMNS)
    .eq("email", auth.leader.email)
    .maybeSingle();
  if (error) return NextResponse.json({ error: emailTablesError(error.message) }, { status: 500 });
  return NextResponse.json({ prefs: prefsFromRow(data as PrefsRow | null) });
}

// PATCH /api/email-prefs  { rpms?, digest?, church_health?, apprentice?, milestones?: boolean }
export async function PATCH(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = validatePrefsPatch(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_email_prefs")
    .upsert({ ...parsed.patch, email: auth.leader.email, updated_at: new Date().toISOString() }, { onConflict: "email" })
    .select(PREFS_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: emailTablesError(error.message) }, { status: 500 });
  return NextResponse.json({ prefs: prefsFromRow(data as PrefsRow | null) });
}
