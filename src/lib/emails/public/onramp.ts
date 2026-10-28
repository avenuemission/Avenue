// Not guarded with server-only: pure template.
// The "you're in" email after an Avenue On-Ramp sign-up. Every value goes
// through renderPublicEmail, which escapes it.
import { ONRAMP } from "@/content/onramp";
import { workshopLabel } from "@/lib/domain/onramp";
import { renderPublicEmail, type PublicEmail } from "./layout";

export function onrampConfirmationEmail(name: string, workshops: readonly string[]): PublicEmail {
  const first = name.split(" ")[0] || name;
  return renderPublicEmail({
    subject: `You're in: ${ONRAMP.title}, ${ONRAMP.date}`,
    preheader: `See you on ${ONRAMP.shortDate}.`,
    eyebrow: ONRAMP.title,
    heading: `You're in, ${first}!`,
    blocks: [
      { type: "p", text: `Thanks for signing up. We can't wait to see you on ${ONRAMP.date}.` },
      {
        type: "stats",
        rows: [
          { label: "When", value: `${ONRAMP.date}, ${ONRAMP.time}` },
          { label: "Where", value: ONRAMP.venue },
        ],
      },
      { type: "h", text: workshops.length > 1 ? "Your workshops" : "Your workshop" },
      { type: "list", items: workshops.map(workshopLabel) },
      {
        type: "p",
        text: "No experience needed, just come as you are. Want to change your workshops? Sign up again with the same email and we'll update your choices.",
      },
    ],
  });
}
