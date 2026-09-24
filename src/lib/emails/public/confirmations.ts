// Not guarded with server-only: pure templates.
// The replies a visitor or leader gets after a form. Subjects and wording
// are the ones the old /api/send-email templates used; only the frame is
// new. Every value goes through renderPublicEmail, which escapes it.
import { absoluteUrl } from "../layout";
import { SUPPORT_ZOOM } from "@/content/support";
import { renderPublicEmail, type PublicEmail } from "./layout";

const CONTACT = "info@avenuemission.com";

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function joinPathwayEmail(name: string, group: string): PublicEmail {
  return renderPublicEmail({
    subject: "Welcome to Avenue - Pathway Group Connection",
    preheader: "A member of our team will be in contact with you soon.",
    eyebrow: "Pathway groups",
    heading: `Welcome, ${name}!`,
    blocks: [
      { type: "p", text: `Thank you for your interest in joining the ${group} pathway group.` },
      {
        type: "p",
        text: "A member of our team will be in contact with you soon to help you get connected. We're excited to have you join our community!",
      },
      { type: "p", text: "In the meantime, feel free to explore our website and learn more about Avenue." },
    ],
  });
}

export function startPathwayEmail(name: string, suburb: string): PublicEmail {
  const where = suburb.trim() ? ` in ${suburb.trim()}` : "";
  return renderPublicEmail({
    subject: "Your Journey Begins - Starting a Pathway Group",
    preheader: "Your next steps for starting a pathway group.",
    eyebrow: "Pathway groups",
    heading: `Thank you, ${name}!`,
    blocks: [
      {
        type: "p",
        text: `Thank you for accepting God's call to grow His kingdom by starting a pathway group${where}. This is an exciting step of faith!`,
      },
      { type: "h", text: "Your next steps:" },
      {
        type: "list",
        items: [
          "Create an account at avenuemission.com/login",
          "Schedule a call with our team",
          "Watch the Avenue video guides",
          "Make a list of people in your life that you can invite and BLESS, and begin praying for them",
        ],
      },
      { type: "link", label: "Create your account", href: absoluteUrl("/login") },
      {
        type: "p",
        text: `We'll be in touch soon to support you on this journey. If you have any questions, feel free to reach out to us at ${CONTACT}.`,
      },
    ],
  });
}

// No visitor values go into this one, so there is nothing to escape.
export function eventUpdatesEmail(): PublicEmail {
  return renderPublicEmail({
    subject: "You're in the loop - Avenue Event Updates",
    preheader: "Thank you for wanting to stay up to date with Avenue events and news.",
    eyebrow: "Event updates",
    heading: "You're in the loop!",
    blocks: [
      {
        type: "p",
        text: "Thank you for wanting to stay up to date with Avenue events and news. We're excited to keep you informed about what's happening in our community.",
      },
      { type: "p", text: "We look forward to meeting you at one of our upcoming events!" },
      { type: "p", text: "In the meantime, check out our Intersection page to see what events are coming up." },
      { type: "link", label: "Intersection page", href: absoluteUrl("/intersection") },
    ],
  });
}

export function apestResultsEmail(name: string, results: Record<string, number>, reflection: string): PublicEmail {
  const rows = Object.entries(results)
    .sort(([, a], [, b]) => b - a)
    .map(([role, percentage]) => ({ label: capitalise(role), value: `${percentage}%` }));
  const paragraphs = reflection
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((text) => ({ type: "p" as const, text }));
  return renderPublicEmail({
    subject: "Your APEST Quiz Results - Discover Your Gifts",
    preheader: "Your APEST results and personalized insights.",
    eyebrow: "APEST quiz",
    heading: name ? `${name}, here are your APEST results!` : "Here are your APEST results!",
    blocks: [
      {
        type: "p",
        text: "Thank you for taking the APEST Quiz. Understanding your spiritual gifts is an important step in discovering how God has uniquely equipped you to serve.",
      },
      { type: "h", text: "Your results:" },
      { type: "stats", rows },
      { type: "h", text: "Your personalized insights:" },
      ...paragraphs,
      { type: "h", text: "What's next?" },
      {
        type: "p",
        text: "Your unique gifting is exactly what's needed to grow the kingdom of God. Consider using your gifts by:",
      },
      {
        type: "list",
        items: ["Joining a Pathway Group to grow in community", "Starting a Pathway Group to lead others"],
      },
    ],
    cta: { label: "Explore Pathways", href: absoluteUrl("/pathways") },
  });
}

export function leaderSupportEmail(leaderName: string, formattedDate: string): PublicEmail {
  return renderPublicEmail({
    subject: "Leader Support Call Confirmed - Avenue",
    preheader: `Your leader support call: ${formattedDate}`,
    eyebrow: "Leader support",
    heading: "Call Confirmed!",
    blocks: [
      { type: "p", text: `Hi ${leaderName}, your leader support call has been scheduled for:` },
      { type: "h", text: formattedDate },
      { type: "h", text: "Zoom Details" },
      {
        type: "stats",
        rows: [
          { label: "Meeting ID", value: SUPPORT_ZOOM.meetingId },
          { label: "Passcode", value: SUPPORT_ZOOM.passcode },
        ],
      },
      { type: "link", label: `Join Link: ${SUPPORT_ZOOM.link}`, href: SUPPORT_ZOOM.link },
      { type: "p", text: "Please ensure your device has a microphone and webcam ready." },
      { type: "p", text: `Need to rebook or cancel? Contact us at ${CONTACT}` },
    ],
  });
}

export function leaderSupportCustomEmail(leaderName: string, requestedDate: string, requestedTime: string): PublicEmail {
  return renderPublicEmail({
    subject: "Custom Time Request Received - Avenue Leader Support",
    preheader: "We'll be in touch shortly to confirm this time.",
    eyebrow: "Leader support",
    heading: "Request Received!",
    blocks: [
      { type: "p", text: `Hi ${leaderName}, we've received your request for a custom support call time.` },
      { type: "stats", rows: [{ label: "Requested Time", value: `${requestedDate} at ${requestedTime}` }] },
      { type: "p", text: "We'll be in touch shortly to confirm this time or suggest an alternative." },
    ],
  });
}
