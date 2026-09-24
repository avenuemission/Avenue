// Not guarded with server-only: the Netlify scheduled function imports this in plain Node. The ESLint boundary rule keeps it out of client code.
// The one mailer. Templates live in lib/emails (leader) and lib/emails/public.
import nodemailer from "nodemailer";

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

// Sends one email. Fails loud: with Gmail not configured it throws, so a
// caller never reports an email as sent when nothing went out.
export async function sendEmail(to: string, subject: string, html: string, options: SendOptions = {}): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured: GMAIL_USER and GMAIL_APP_PASSWORD must both be set");
  }

  await transporter.sendMail({
    from: `Avenue Mission <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    ...(options.text ? { text: options.text } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  });
}
