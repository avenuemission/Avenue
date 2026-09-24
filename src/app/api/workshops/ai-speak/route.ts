import { NextRequest, NextResponse } from "next/server";
import { requireLeader } from "@/lib/server/requireLeader";

export const maxDuration = 60;

// Generous enough for the spoken script this reads out loud, small enough
// that a leader session cannot be used to run up an unbounded TTS bill.
const TEXT_MAX = 8000;

export async function POST(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  if (!auth.leader.fullAccess) return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }
  if (text.length > TEXT_MAX) {
    return NextResponse.json({ error: `Text is too long (max ${TEXT_MAX} characters)` }, { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "shimmer",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("TTS error:", err);
    return NextResponse.json({ error: "TTS generation failed" }, { status: 500 });
  }

  // Stream the body directly back: this avoids buffering the full audio in memory
  // and prevents serverless timeout on long TTS responses
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
    },
  });
}
