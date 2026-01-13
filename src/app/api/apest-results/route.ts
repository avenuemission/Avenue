import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { results } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Sort results to find strongest gifts
    const sortedResults = Object.entries(results)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([role, percentage]) => `${role}: ${percentage}%`);

    const prompt = `You are a spiritual gifts counselor helping someone understand their APEST profile based on Ephesians 4:11. The person has just completed an assessment with the following results:

${sortedResults.join("\n")}

Please provide a personalized response (2 paragraphs) that includes:
1. Their strongest gifting and what it means for them
2. Their unique blend of gifts and how these work together
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
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to generate personalized results" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const personalizedResponse = data.choices[0]?.message?.content;

    if (!personalizedResponse) {
      return NextResponse.json(
        { error: "No response generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: personalizedResponse });
  } catch (error) {
    console.error("Error generating APEST results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
