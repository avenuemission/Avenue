// Not guarded with server-only: pure, like ../layout.ts.
// The frame for transactional replies to the public (form confirmations,
// APEST results) and admin notifications: the same branded card as the
// leader emails, but the footer is a plain site link. These are one-off
// replies to something the reader just did, so there is nothing to
// unsubscribe from.
import { COLOURS, esc, renderFrame, siteUrl, type FrameContent } from "../layout";

export type PublicEmailContent = FrameContent;

export interface PublicEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderPublicEmail(content: PublicEmailContent): PublicEmail {
  const site = siteUrl();
  const label = site.replace(/^https?:\/\//, "");
  const { html, text } = renderFrame(content, {
    html: `Avenue Mission<br>
<a href="${esc(site)}" style="color:${COLOURS.muted};text-decoration:underline;">${esc(label)}</a>`,
    text: ["Avenue Mission", site],
  });
  return { subject: content.subject, html, text };
}
