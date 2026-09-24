import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { absoluteUrl } from "@/lib/emails/layout";
import { renderNoticePage, type NoticePage } from "@/lib/emails/noticePage";
import { EMAIL_KIND_INFO, emailTablesError, parseUnsubscribe, unsubscribePatch, type EmailKind } from "@/lib/emails/prefs";

// One-click unsubscribe (spec 3.2). No sign-in: the token in the link is the
// only key, it must be a UUID, and the only write sets preference columns
// to false on the row with that token. It never reads an email from the
// request. GET shows a confirm button and writes nothing, because mail
// scanners open every GET link; POST (that button, or a mail client's
// RFC 8058 one-click) turns the emails off. Repeating it is harmless.
// A well-formed token that matches no row gets the same page and status
// as one that does, so the route never reveals which tokens exist.

function page(status: number, body: NoticePage): NextResponse {
  return new NextResponse(renderNoticePage(body), {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

// Henry to check wording (every page string in this file)
function which(kinds: EmailKind[]): string {
  return kinds.length > 1 ? "any Avenue leader emails" : `"${EMAIL_KIND_INFO[kinds[0]].label}" emails`;
}

const manage = () => ({ label: "Manage emails", href: absoluteUrl("/leaders/emails") });

const invalid = (): NoticePage => ({
  title: "This link is not valid",
  message: "This unsubscribe link is not valid. You can change your emails any time from your dashboard.",
  link: manage(),
});

function parse(request: NextRequest) {
  const url = new URL(request.url);
  return parseUnsubscribe(url.searchParams.get("token"), url.searchParams.get("kind"));
}

// GET /api/email/unsubscribe?token=<uuid>&kind=<kind|all>
export async function GET(request: NextRequest) {
  const parsed = parse(request);
  if ("error" in parsed) return page(400, invalid());
  const kind = parsed.kinds.length > 1 ? "all" : parsed.kinds[0];
  return page(200, {
    title: "Unsubscribe?",
    message: `Stop getting ${which(parsed.kinds)} from Avenue?`,
    form: { action: `/api/email/unsubscribe?token=${encodeURIComponent(parsed.token)}&kind=${kind}`, button: "Unsubscribe" },
  });
}

// POST /api/email/unsubscribe?token=<uuid>&kind=<kind|all>
export async function POST(request: NextRequest) {
  const parsed = parse(request);
  if ("error" in parsed) return page(400, invalid());

  const { data, error } = await getSupabaseAdmin()
    .from("leader_email_prefs")
    .update({ ...unsubscribePatch(parsed.kinds), updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", parsed.token)
    .select("email");
  if (error) {
    console.error("unsubscribe: update failed:", emailTablesError(error.message));
    return page(500, {
      title: "Something went wrong",
      message: "We could not update your emails just now. Please try the link again later.",
    });
  }
  if (!Array.isArray(data) || data.length === 0) console.warn("unsubscribe: token matched no row");
  return page(200, {
    title: "You're unsubscribed",
    message: `You won't get ${which(parsed.kinds)} any more. You can turn them back on any time.`,
    link: manage(),
  });
}
