import { llmsText } from "@/lib/domain/llmsTxt";

// Served at /llms.txt: who Avenue is, where and when, and the key pages, in
// plain text for AI assistants. Built at deploy time from AVENUE_FACTS.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsText(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
