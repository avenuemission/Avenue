import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/requireAdmin";

// GET /api/admin/session: the passcode probe the admin page uses at sign
// in. 204 for the right key, 401 for a wrong one, 429 while locked out.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  return new NextResponse(null, { status: 204 });
}
