import { NextRequest, NextResponse } from "next/server";
import { parseApestRequest } from "@/lib/domain/forms";
import type { ApestResults } from "@/lib/domain/apest";
import { apestResultsEmail } from "@/lib/emails/public/confirmations";
import { adminNotificationEmail, sendAdminEmail } from "@/lib/emails/public/admin";
import { sendEmail } from "@/lib/server/mail/transport";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, serverError, tooMany } from "@/lib/server/http";

// The results, an optional name and email, and nothing else: a few hundred
// bytes. Anything bigger is refused before it is parsed.
const MAX_BODY_BYTES = 4096;

// One gpt-4o call: a personal reflection on these results, plain text.
// Throws on any failure; the route answers 500 and sends nothing.
async function writeReflection(results: ApestResults): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  // Sort results to find strongest gifts
  const sortedResults = Object.entries(results)
    .sort(([, a], [, b]) => b - a)
    .map(([role, percentage]) => `${role}: ${percentage}%`);

  const prompt = `You are a spiritual gifts counselor helping someone understand their APEST profile based on Ephesians 4:11. The person has just completed an assessment with the following results:

${sortedResults.join("\n")}

Please provide a personalized response (4 short paragraphs) that includes:
1. Their strongest gifting and what it means for them (core motivation and lens)
2. Their second strongest gifting and how it works with their first (the secondary is usually the voice or expression of the strongest
4. Gracefully mention the challenges and blind spots of their strongest giftings
3. A biblical example of someone with a similar profile (e.g., Paul as Apostle/Teacher, Barnabas as Shepherd/Evangelist, etc.)

Keep the tone warm, encouraging, and focused on how they can use these gifts to serve others and lead in community. Do not use markdown formatting - just plain text paragraphs.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a warm and encouraging spiritual gifts counselor who helps people understand their unique calling based on the APEST framework from Ephesians 4:11.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    console.error("OpenAI API error:", response.status, error);
    throw new Error("Failed to generate personalized results");
  }

  const data = await response.json();
  const reflection = data.choices?.[0]?.message?.content;
  if (typeof reflection !== "string" || !reflection.trim()) throw new Error("No response generated");
  return reflection;
}

// POST /api/apest-results
//   { results }                       -> { response } (the quiz page and leader training)
//   { results, email, name?, company } -> also emails the results to that one
//                                         address and notifies the admin
// The email is written here from the results and a fresh reflection; the
// browser never supplies any of its text.
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return jsonError(413, "Request too large");

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError(400, "Invalid request");
    }

    const parsed = parseApestRequest(body);
    if (!parsed.ok) {
      // A bot filled the honeypot: answer as if it worked, do nothing.
      if (parsed.error === "spam") return NextResponse.json({ success: true });
      return jsonError(400, parsed.error);
    }
    const { results, email, name } = parsed.value;

    // allow() throws if the limiter is down; the catch turns that into a 500.
    if (!(await allow(RATE.openai, clientIp(request)))) return tooMany();

    const reflection = await writeReflection(results);

    if (email) {
      if (await allow(RATE.formRecipient, email.toLowerCase())) {
        const visitor = apestResultsEmail(name, { ...results }, reflection);
        await sendEmail(email, visitor.subject, visitor.html, { text: visitor.text });
      }
      await sendAdminEmail(
        adminNotificationEmail("APEST Quiz Results", {
          name: name || "Not provided",
          email,
          ...Object.fromEntries(Object.entries(results).map(([role, value]) => [role, `${value}%`])),
        })
      );
    }

    return NextResponse.json({ response: reflection });
  } catch (error) {
    return serverError("apest-results POST", error);
  }
}
