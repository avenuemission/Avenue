import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { readRows } from "@/lib/server/adminRead";
import { serverError } from "@/lib/server/http";
import {
  buildChurchHealth,
  type HealthCheckinRow,
  type HealthLeaderRow,
  type HealthPersonRow,
  type HealthProfileRow,
} from "@/lib/domain/churchHealth";

// GET /api/admin/church-health (admin Bearer key). Read only: loads four
// tables and returns buildChurchHealth. Any read error is a 500, never a
// partial answer.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const db = getSupabaseAdmin();
    const [leaders, profiles, people, checkins] = await Promise.all([
      readRows<HealthLeaderRow>(db, "leaders", "email, name, full_access"),
      readRows<HealthProfileRow>(db, "leader_profiles", "email, display_name, pathway_group"),
      readRows<HealthPersonRow>(db, "leader_people", "owner_email, first_name, last_name, metrics, created_at"),
      readRows<HealthCheckinRow>(db, "leader_checkins", "email, week_start, relational, physical, mental, spiritual"),
    ]);
    return NextResponse.json(buildChurchHealth({ leaders, profiles, people, checkins, now: new Date() }));
  } catch (e) {
    return serverError("church-health", e);
  }
}
