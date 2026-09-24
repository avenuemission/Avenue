import { NextRequest, NextResponse } from "next/server";
import { adminConfigError, getSupabaseAdmin, isAdminAuthorized } from "@/lib/server/supabaseAdmin";
import { normEmail } from "@/lib/domain/churchHealth";
import { composeFor, firstNameOf } from "@/lib/emails/compose";
import { loadSnapshot } from "@/lib/emails/loadSnapshot";
import { isEmailKind, PREVIEW_TOKEN, type Recipient } from "@/lib/emails/prefs";
import { milestoneEmail } from "@/lib/emails/templates";

// GET /api/admin/email-preview?kind=<kind>&email=<leader email> (admin key).
// Renders one leader's email as the engine would right now. Sends nothing
// and writes nothing. It always uses PREVIEW_TOKEN, never the leader's real
// unsubscribe token: the admin passcode must not be a way to collect
// tokens, and the sandboxed preview frame cannot follow links anyway.
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (!isEmailKind(kind)) {
    return NextResponse.json(
      { error: "kind must be one of rpms, digest, church_health, apprentice, milestones" },
      { status: 400 }
    );
  }
  const email = normEmail(url.searchParams.get("email") ?? "");
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  try {
    const snap = await loadSnapshot(getSupabaseAdmin(), new Date());
    const leader = snap.leaders.find((l) => normEmail(l.email) === email);
    if (!leader) return NextResponse.json({ error: "No leader with that email" }, { status: 404 });
    const row = snap.prefs.find((p) => normEmail(p.email) === email);
    const recipient: Recipient = {
      email,
      name: leader.name?.trim() || email.split("@")[0],
      token: PREVIEW_TOKEN,
    };

    // Henry to check wording (the notes below)
    const notes: string[] = [];
    if (leader.full_access !== true) notes.push("This leader does not have full access, so the engine would not email them.");
    if (row && row[kind] === false) notes.push("This leader has turned this email off, so the engine would skip them.");

    const outgoing = composeFor(kind, recipient, snap);
    if (outgoing.length > 1) notes.push(`${outgoing.length} are due today; this is the first.`);
    const first = outgoing[0];
    if (first) {
      const { subject, html, text } = first.message;
      return NextResponse.json({ subject, html, text, periodKey: first.periodKey, note: notes.join(" ") || null });
    }
    if (kind === "milestones") {
      const sample = milestoneEmail({
        firstName: firstNameOf(recipient, snap),
        token: PREVIEW_TOKEN,
        milestone: { type: "walked", stop: "phase1" },
      });
      notes.unshift("Nothing is due for this leader today. This is a sample (Foundations walked).");
      return NextResponse.json({ subject: sample.subject, html: sample.html, text: sample.text, periodKey: null, note: notes.join(" ") });
    }
    notes.unshift("This leader has no apprentices, so this email would be skipped.");
    return NextResponse.json({ subject: null, html: null, text: null, periodKey: null, note: notes.join(" ") });
  } catch (e) {
    console.error("email-preview:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
