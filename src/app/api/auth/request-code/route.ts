import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/supabaseAdmin";

// POST /api/auth/request-code  { email }
// Sends a numeric sign-in code, but only to an email already in `leaders`.
// The reply is the same whether or not the email is a leader, so this
// endpoint cannot be used to discover who the leaders are.
const NEUTRAL = "If that email is registered, a code is on its way.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const body = await request.json().catch(() => null);
  const raw = body && typeof body.email === "string" ? body.email : "";
  const email = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: leader, error } = await db.from("leaders").select("email").eq("email", email).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (leader) {
    const { error: otpErr } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (otpErr) {
      const status = otpErr.status === 429 ? 429 : 500;
      const message = status === 429 ? "Too many codes requested. Please wait a few minutes and try again." : otpErr.message;
      return NextResponse.json({ error: message }, { status });
    }
  }
  return NextResponse.json({ ok: true, message: NEUTRAL });
}
