import "server-only";
// A small branded page for the unsubscribe link. It is a web page, not an
// email, so it may use a <style> block (for the focus ring), but it shares
// the emails' night palette and text wordmark.
import { COLOURS, esc, FONT_LINK, SANS, WORDMARK_HTML } from "./layout";

export interface NoticePage {
  title: string;
  message: string;
  form?: { action: string; button: string };
  link?: { label: string; href: string };
}

export function renderNoticePage(input: NoticePage): string {
  const form = input.form
    ? `<form method="post" action="${esc(input.form.action)}"><button type="submit">${esc(input.form.button)}</button></form>`
    : "";
  const link = input.link ? `<p><a href="${esc(input.link.href)}">${esc(input.link.label)}</a></p>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${esc(input.title)} | Avenue</title>
${FONT_LINK}
<style>
body{margin:0;background:${COLOURS.ground};color:${COLOURS.body};font-family:${SANS};}
main{max-width:480px;margin:0 auto;padding:64px 16px;}
.mark{margin:0 0 32px;}
h1{font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-0.3px;text-transform:uppercase;color:${COLOURS.ink};margin:0 0 12px;}
p{line-height:1.6;}
button{min-height:44px;padding:0 24px;border:0;border-radius:999px;background:${COLOURS.button};color:${COLOURS.buttonText};font-family:inherit;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;cursor:pointer;}
a{color:${COLOURS.label};display:inline-block;min-height:44px;line-height:44px;}
button:focus-visible,a:focus-visible{outline:2px solid ${COLOURS.label};outline-offset:3px;}
</style>
</head>
<body><main><p class="mark">${WORDMARK_HTML}</p><h1>${esc(input.title)}</h1><p>${esc(input.message)}</p>${form}${link}</main></body>
</html>`;
}
