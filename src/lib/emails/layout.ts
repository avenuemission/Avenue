// The branded frame every leader email shares (spec 3.2). Pure.
// Mail clients handle <style> blocks and web fonts unevenly (Gmail strips
// some, Outlook renders with Word), so this is nested tables with inline
// styles only, Georgia for headings, and the Avenue wordmark as text: no
// remote image has to load for the email to look right.
import type { EmailKind } from "./prefs";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export interface FooterLinks {
  manageUrl: string;
  unsubscribeUrl: string;
  unsubscribeAllUrl: string;
}

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "stats"; rows: { label: string; value: string }[] }
  | { type: "link"; label: string; href: string };

export interface EmailContent {
  kind: EmailKind;
  token: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  blocks: Block[];
  cta?: { label: string; href: string };
}

export const COLOURS = {
  ground: "#05070c",
  card: "#0b1020",
  line: "#1c2436",
  ink: "#f4f1ea",
  muted: "#a3a9b8",
  lamp: "#ffc56b",
  button: "#4f7cff",
} as const;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function siteUrl(): string {
  const raw = process.env.AVENUE_SITE_URL?.trim();
  return (raw || "https://www.avenuemission.com").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function unsubscribeUrl(token: string, kind: EmailKind | "all"): string {
  return absoluteUrl(`/api/email/unsubscribe?token=${encodeURIComponent(token)}&kind=${kind}`);
}

export function footerLinks(token: string, kind: EmailKind): FooterLinks {
  return {
    manageUrl: absoluteUrl("/leaders/emails"),
    unsubscribeUrl: unsubscribeUrl(token, kind),
    unsubscribeAllUrl: unsubscribeUrl(token, "all"),
  };
}

// RFC 8058: mail clients that show their own "Unsubscribe" button POST
// "List-Unsubscribe=One-Click" to this URL.
export function listUnsubscribeHeaders(token: string, kind: EmailKind): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(token, kind)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only web links belong in an email. esc keeps an href inside its quotes,
// but a "javascript:" or "data:" link would survive it, so renderEmail
// refuses anything that is not an absolute http or https URL.
export function isHttpUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function assertWebLinks(content: EmailContent): void {
  const hrefs = content.blocks.flatMap((b) => (b.type === "link" ? [b.href] : []));
  if (content.cta) hrefs.push(content.cta.href);
  for (const href of hrefs) {
    if (!isHttpUrl(href)) throw new Error(`renderEmail: refusing a link that is not http or https: ${href}`);
  }
}

// The site logo as text: letter-spaced uppercase AVENUE in a plain sans,
// then a thin chevron. No image, so it shows before images are allowed.
export const WORDMARK_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const WORDMARK_HTML = `<span style="font-family:${WORDMARK_FONT};font-size:18px;line-height:1;font-weight:bold;letter-spacing:6px;text-transform:uppercase;color:${COLOURS.ink};">AVENUE</span><span style="font-family:${WORDMARK_FONT};font-size:22px;line-height:1;font-weight:300;color:${COLOURS.lamp};padding-left:4px;">&rsaquo;</span>`;

const TEXT = `font-family:${SANS};font-size:16px;line-height:1.6;color:${COLOURS.ink};`;

function blockHtml(block: Block): string {
  switch (block.type) {
    case "p":
      return `<p style="margin:0 0 16px 0;${TEXT}">${esc(block.text)}</p>`;
    case "h":
      return `<h2 style="margin:28px 0 10px 0;font-family:${SERIF};font-size:20px;line-height:1.3;font-weight:normal;color:${COLOURS.lamp};">${esc(block.text)}</h2>`;
    case "list":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">${block.items
        .map(
          (item) =>
            `<tr><td width="18" valign="top" style="${TEXT}color:${COLOURS.lamp};">&#8226;</td><td style="${TEXT}">${esc(item)}</td></tr>`
        )
        .join("")}</table>`;
    case "stats":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">${block.rows
        .map(
          (row) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid ${COLOURS.line};font-family:${SANS};font-size:15px;color:${COLOURS.muted};">${esc(row.label)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${COLOURS.line};font-family:${SANS};font-size:15px;font-weight:bold;color:${COLOURS.ink};">${esc(row.value)}</td></tr>`
        )
        .join("")}</table>`;
    case "link":
      return `<p style="margin:0 0 16px 0;${TEXT}"><a href="${esc(block.href)}" style="color:${COLOURS.lamp};text-decoration:underline;">${esc(block.label)}</a></p>`;
  }
}

function blockText(block: Block): string[] {
  switch (block.type) {
    case "p":
      return [block.text, ""];
    case "h":
      return [block.text.toUpperCase(), ""];
    case "list":
      return [...block.items.map((item) => `- ${item}`), ""];
    case "stats":
      return [...block.rows.map((row) => `${row.label}: ${row.value}`), ""];
    case "link":
      return [`${block.label}: ${block.href}`, ""];
  }
}

// Henry to check wording
function renderHtml(content: EmailContent, footer: FooterLinks): string {
  const cta = content.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 4px 0;"><tr><td bgcolor="${COLOURS.button}" style="padding:14px 28px;border-radius:999px;background-color:${COLOURS.button};"><a href="${esc(content.cta.href)}" style="display:inline-block;font-family:${SANS};font-size:16px;font-weight:bold;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(content.cta.label)}</a></td></tr></table>`
    : "";
  const link = `color:${COLOURS.muted};text-decoration:underline;`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOURS.ground};">
<div style="display:none;mso-hide:all;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLOURS.ground};">${esc(content.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLOURS.ground}" style="background-color:${COLOURS.ground};">
<tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 0 24px 4px;">${WORDMARK_HTML}</td></tr>
<tr><td bgcolor="${COLOURS.card}" style="background-color:${COLOURS.card};border:1px solid ${COLOURS.line};border-radius:16px;padding:32px 28px;">
<p style="margin:0 0 8px 0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLOURS.lamp};">${esc(content.eyebrow)}</p>
<h1 style="margin:0 0 20px 0;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:normal;color:${COLOURS.ink};">${esc(content.heading)}</h1>
${content.blocks.map(blockHtml).join("\n")}
${cta}
</td></tr>
<tr><td style="padding:24px 8px 0 8px;font-family:${SANS};font-size:12px;line-height:1.8;color:${COLOURS.muted};">
You get this because you lead with Avenue Mission.<br>
<a href="${esc(footer.manageUrl)}" style="${link}">Manage emails</a> &nbsp;|&nbsp; <a href="${esc(footer.unsubscribeUrl)}" style="${link}">Unsubscribe from these</a> &nbsp;|&nbsp; <a href="${esc(footer.unsubscribeAllUrl)}" style="${link}">Unsubscribe from all</a>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

// Henry to check wording
function renderText(content: EmailContent, footer: FooterLinks): string {
  const lines = ["AVENUE", "", content.eyebrow, content.heading, "", ...content.blocks.flatMap(blockText)];
  if (content.cta) lines.push(`${content.cta.label}: ${content.cta.href}`, "");
  lines.push(
    "--",
    "You get this because you lead with Avenue Mission.",
    `Manage emails: ${footer.manageUrl}`,
    `Unsubscribe from these: ${footer.unsubscribeUrl}`,
    `Unsubscribe from all: ${footer.unsubscribeAllUrl}`
  );
  return lines.join("\n");
}

export function renderEmail(content: EmailContent): RenderedEmail {
  assertWebLinks(content);
  const footer = footerLinks(content.token, content.kind);
  return {
    subject: content.subject,
    html: renderHtml(content, footer),
    text: renderText(content, footer),
    headers: listUnsubscribeHeaders(content.token, content.kind),
  };
}
