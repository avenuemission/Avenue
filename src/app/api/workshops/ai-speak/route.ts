import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
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

  const audioBuffer = await response.arrayBuffer();

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
}
