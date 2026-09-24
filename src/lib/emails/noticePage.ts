// A small branded page for the unsubscribe link. It is a web page, not an
// email, so it may use a <style> block (for the focus ring), but it shares
// the emails' night palette and text wordmark.
import { COLOURS, esc } from "./layout";

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
<style>
body{margin:0;background:${COLOURS.ground};color:${COLOURS.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
main{max-width:480px;margin:0 auto;padding:64px 16px;}
.mark{font-family:Georgia,'Times New Roman',serif;font-size:30px;margin:0 0 32px;}
.mark span{color:${COLOURS.lamp};}
h1{font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;margin:0 0 12px;}
p{line-height:1.6;}
button{min-height:44px;padding:0 24px;border:0;border-radius:999px;background:${COLOURS.button};color:#fff;font-size:16px;font-weight:bold;cursor:pointer;}
a{color:${COLOURS.lamp};display:inline-block;min-height:44px;line-height:44px;}
button:focus-visible,a:focus-visible{outline:2px solid ${COLOURS.lamp};outline-offset:3px;}
</style>
</head>
<body><main><p class="mark">Avenue<span>.</span></p><h1>${esc(input.title)}</h1><p>${esc(input.message)}</p>${form}${link}</main></body>
</html>`;
}
