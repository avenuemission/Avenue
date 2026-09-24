// Not guarded with server-only: pure apart from sendLeaderSignupNotification,
// and the ESLint boundary rule keeps lib/emails out of client code.
// Notifications to the Avenue admin inbox. The address is fixed here; no
// request can change who gets these.
import { sendEmail } from "@/lib/server/mail/transport";
import { renderPublicEmail, type PublicEmail } from "./layout";

export const ADMIN_EMAIL = "henrymcmahon@avenuemission.com";

function submittedOn(now: Date): string {
  return now.toLocaleString("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rowsOf(details: Record<string, string>) {
  return Object.entries(details).map(([key, value]) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }));
}

// One form submission, as the old /api/send-email adminNotification did.
export function adminNotificationEmail(label: string, details: Record<string, string>, now: Date = new Date()): PublicEmail {
  return renderPublicEmail({
    subject: `New Form Submission: ${label}`,
    preheader: `New ${label} submission`,
    eyebrow: "Admin Notification",
    heading: `New ${label} submission`,
    blocks: [{ type: "p", text: `Submitted on ${submittedOn(now)}` }, { type: "stats", rows: rowsOf(details) }],
  });
}

export function leaderSignupNotificationEmail(name: string, email: string, now: Date = new Date()): PublicEmail {
  const title = "New Leader Account Created";
  return renderPublicEmail({
    subject: `Avenue: ${title}`,
    preheader: title,
    eyebrow: "Admin Notification",
    heading: title,
    blocks: [{ type: "stats", rows: rowsOf({ name, email }) }, { type: "p", text: `Submitted on ${submittedOn(now)}` }],
  });
}

export async function sendAdminEmail(email: PublicEmail): Promise<void> {
  await sendEmail(ADMIN_EMAIL, email.subject, email.html, { text: email.text });
}

export async function sendLeaderSignupNotification(name: string, email: string): Promise<void> {
  await sendAdminEmail(leaderSignupNotificationEmail(name, email));
}
