import { NextRequest, NextResponse } from "next/server";
import { parseForm, type FormSubmission } from "@/lib/domain/forms";
import { formEmails } from "@/lib/emails/public/forms";
import { sendAdminEmail } from "@/lib/emails/public/admin";
import { sendEmail } from "@/lib/server/mail/transport";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { errorKind, jsonError, serverError, tooMany } from "@/lib/server/http";

// POST /api/forms/<type>: the one public form endpoint. The server picks
// every recipient: the admin notification goes to the fixed admin address,
// the confirmation only to the one validated address in the form (or, for
// leader support, to the signed-in leader's own address). Every template
// is fixed and escapes what the visitor typed.
export async function POST(request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;
  try {
    // Leader support is for signed-in leaders only; who they are comes from
    // the session, not the body.
    let leader: { email: string; name: string } | null = null;
    if (type === "leader-support") {
      const auth = await requireLeader(request);
      if ("response" in auth) return auth.response;
      leader = auth.leader;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Invalid form");
    }

    // A leader's name and email come from the session, not the body.
    if (leader && typeof body === "object" && body !== null && !Array.isArray(body)) {
      body = { ...body, name: leader.name.trim() || leader.email.split("@")[0] };
    }

    const parsed = parseForm(type, body);
    if (!parsed.ok) {
      // A bot filled the honeypot: answer as if it worked, do nothing.
      if (parsed.error === "spam") return NextResponse.json({ success: true });
      return jsonError(400, parsed.error);
    }

    const form: FormSubmission = leader ? { ...parsed.value, email: leader.email } : parsed.value;

    // allow() throws if the limiter itself is down; the catch below turns
    // that into a 500 rather than letting the form through unlimited.
    if (!(await allow(RATE.form, clientIp(request)))) return tooMany();
    const confirmTo = form.email && (await allow(RATE.formRecipient, form.email.toLowerCase())) ? form.email : null;

    const { data: saved, error } = await getSupabaseAdmin()
      .from("form_submissions")
      .insert({ form_type: form.type, name: form.name, email: form.email, data: form.data })
      .select("id")
      .single();
    if (error) return serverError(`forms/${type} insert`, error);

    // The row is saved, so the submission has succeeded. A mail failure from
    // here on is logged (form type, row id, error kind: no personal data)
    // and reported as emailed: false, not as an error.
    const emails = formEmails(form);
    const sends: [string, () => Promise<void>][] = [["admin", () => sendAdminEmail(emails.admin)]];
    const confirmation = emails.confirmation;
    if (confirmTo && confirmation) {
      sends.push(["confirmation", () => sendEmail(confirmTo, confirmation.subject, confirmation.html, { text: confirmation.text })]);
    }
    let emailed = true;
    for (const [which, send] of sends) {
      try {
        await send();
      } catch (mailError) {
        emailed = false;
        console.error(`forms/${type}: ${which} email failed for submission ${(saved as { id?: unknown } | null)?.id ?? "unknown"}`, errorKind(mailError));
      }
    }

    return NextResponse.json({ ok: true, emailed });
  } catch (error) {
    return serverError(`forms/${type} POST`, error);
  }
}
