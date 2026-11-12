import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { errorKind, jsonError, serverError, tooMany } from "@/lib/server/http";
import { isEmailConfigured, sendEmail } from "@/lib/server/mail/transport";
import { parseOnrampSignup } from "@/lib/domain/onramp";
import { onrampConfirmationEmail } from "@/lib/emails/public/onramp";

// POST /api/onramp: { name, email, workshops, company }. A sign-up for the
// Avenue On-Ramp training day (/onramp). Public. One row per email: signing
// up again with the same email updates that row instead of adding one.
// Each sign-up also becomes a pending leader (portal access for Leader
// Training), unless the email is already in leaders.
// Answers { ok, updated, emailed }.
export async function POST(request: NextRequest) {
  try {
    const parsed = parseOnrampSignup(await request.json().catch(() => null));
    if (!parsed.ok) {
      // A bot filled the honeypot: answer as if it worked, do nothing.
      if ("spam" in parsed) return NextResponse.json({ ok: true, updated: false, emailed: false });
      return jsonError(400, parsed.error);
    }

    // allow() throws if the limiter itself is down: that is a 500, never
    // an unlimited form.
    if (!(await allow(RATE.onramp, clientIp(request)))) return tooMany();

    const { name, email, workshops } = parsed.value;
    const { data, error } = await getSupabaseAdmin()
      .from("onramp_signups")
      .upsert({ name, email, workshops }, { onConflict: "email" })
      .select("created_at, updated_at")
      .single();
    if (error) return serverError("onramp upsert", error);
    // The update trigger moves updated_at on, so a second sign-up shows here.
    const saved = data as { created_at: string; updated_at: string } | null;
    const updated = saved !== null && saved.created_at !== saved.updated_at;

    // Portal access: a sign-up becomes a pending leader, so they can log in
    // and do Leader Training. The insert ignores an existing leaders row
    // with the same email, so a leader's full_access is never touched and
    // no duplicate is made. Nothing is emailed: they sign in from /login.
    const { error: leaderError } = await getSupabaseAdmin()
      .from("leaders")
      .upsert(
        { id: crypto.randomUUID(), email, name, full_access: false },
        { onConflict: "email", ignoreDuplicates: true }
      );
    if (leaderError) return serverError("onramp leader access", leaderError);

    // The sign-up is saved, so it has succeeded. A mail failure is logged
    // (error kind only: no address) and reported as emailed: false.
    let emailed = false;
    if (isEmailConfigured()) {
      try {
        const mail = onrampConfirmationEmail(name, workshops);
        await sendEmail(email, mail.subject, mail.html, { text: mail.text });
        emailed = true;
      } catch (mailError) {
        console.error("onramp: confirmation email failed", errorKind(mailError));
      }
    }

    return NextResponse.json({ ok: true, updated, emailed });
  } catch (error) {
    return serverError("onramp POST", error);
  }
}
