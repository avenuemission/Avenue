// Not guarded with server-only: the Netlify scheduled function imports this in plain Node. The ESLint boundary rule keeps it out of client code.
// The one mailer. Templates live in lib/emails (leader) and lib/emails/public.
import nodemailer from "nodemailer";

const FROM_EMAIL = `Avenue Mission <${process.env.GMAIL_USER}>`;

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Optional extras: a plain-text alternative and extra headers (the leader
// emails send List-Unsubscribe). Existing callers pass neither and behave
// exactly as before.
export interface SendOptions {
  text?: string;
  headers?: Record<string, string>;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Send email helper
export async function sendEmail(to: string, subject: string, html: string, options: SendOptions = {}): Promise<void> {
  if (!isEmailConfigured()) {
    console.error("Email service not configured - missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return;
  }

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    ...(options.text ? { text: options.text } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  });
}
