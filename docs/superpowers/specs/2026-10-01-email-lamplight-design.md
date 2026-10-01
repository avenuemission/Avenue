# Email lamplight

Date: 1 Oct 2026. Status: approved (mockup https://claude.ai/artifact/8XpM6hpQxhxKGxYMHtvUBq, option A "Site match").

## Goal

Make every Avenue email (leader emails, public form replies, APEST results, admin notices) and the unsubscribe page match the site after the lamplight change.

## Changes (one shared frame: src/lib/emails/layout.ts)

| Part | Before | After |
|---|---|---|
| Main heading | Georgia serif | Bold (800) uppercase sans |
| Eyebrow and section headings | Amber, serif subheads | Small blue (#4f7cff) uppercase labels |
| Button | Violet-blue, white text | Amber (#ffc56b), dark uppercase text |
| Text links | Amber | Blue |
| Body text, panel | Cream on #0b1020 | #d6dbe6 on the site panel #0c0f16 |
| Wordmark | Bold AVENUE, amber chevron | Thin AVENUE, white chevron (site header) |
| Font | System sans | Geist via a Google Fonts link where the inbox allows (Apple Mail, iOS); Helvetica or Arial elsewhere |

No picture header (option B was declined). Wording, schedule and recipients unchanged. Plain-text versions unchanged.

## Testing

layout.test.ts and public.test.ts pin the new type, colours and button. check:function confirms the Netlify function still bundles.
