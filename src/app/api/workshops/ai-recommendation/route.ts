import { NextRequest, NextResponse } from "next/server";

function summariseResponses(responses: Record<string, string>[]): string {
  if (responses.length === 0) return "No responses available.";

  const n = responses.length;

  const scaleAvg = (field: string): string => {
    const nums = responses
      .map(r => parseFloat(r[field]))
      .filter(v => !isNaN(v) && v !== undefined);
    if (nums.length === 0) return "no data";
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  };

  const topValue = (field: string): string => {
    const counts: Record<string, number> = {};
    for (const r of responses) {
      const v = r[field] || "No answer";
      counts[v] = (counts[v] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  };

  const multiTop = (field: string, topN = 3): string => {
    const counts: Record<string, number> = {};
    for (const r of responses) {
      const vals = (r[field] || "").split(",").map((v: string) => v.trim()).filter(Boolean);
      for (const v of vals) counts[v] = (counts[v] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ");
  };

  const tegmarkRanking = (): string => {
    const outcomes = [
      { key: "tegmark_rank_dictatorship", label: "AI Dictatorship" },
      { key: "tegmark_rank_enslaved", label: "Enslaved AGI" },
      { key: "tegmark_rank_gatekeeper", label: "Gatekeeper" },
      { key: "tegmark_rank_zookeeper", label: "Zookeeper" },
      { key: "tegmark_rank_libertarian", label: "Libertarian Utopia" },
      { key: "tegmark_rank_egalitarian", label: "Egalitarian Utopia" },
      { key: "tegmark_rank_protector", label: "Protector AGI" },
    ];
    const scored = outcomes.map(o => {
      const nums = responses.map(r => parseFloat(r[o.key])).filter(v => !isNaN(v));
      const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 7;
      return `${o.label}: avg rank ${avg.toFixed(1)}`;
    }).sort((a, b) => {
      const avgA = parseFloat(a.split("rank ")[1]);
      const avgB = parseFloat(b.split("rank ")[1]);
      return avgA - avgB;
    });
    return scored.join(", ");
  };

  const quotes = responses
    .map(r => r["final_vision"])
    .filter(Boolean)
    .slice(0, 3)
    .map(q => `"${q}"`)
    .join(" | ");

  return `
Group size: ${n} participants
Roles represented: ${multiTop("role", 4)}
Most used AI tools: ${multiTop("ai_tools", 4)}
Tech comfort avg: ${scaleAvg("tech_comfort")}/5

PERSONAL LINE:
- Uses AI in personal spiritual practices: avg ${scaleAvg("personal_spiritual_use")}/5
- AI has positively impacted faith: avg ${scaleAvg("faith_impact")}/5
- Concerned about AI dependency: avg ${scaleAvg("decision_dependency")}/5
- Personal off-limits uses: ${multiTop("off_limits_uses", 3)}
- AI has idolatry potential: avg ${scaleAvg("idolatry_potential")}/5

CHURCH LINE (1=Def No, 5=Def Yes):
- Sermon prep: avg ${scaleAvg("church_sermon_prep")}/5
- Social media: avg ${scaleAvg("church_social_media")}/5
- Website: avg ${scaleAvg("church_website")}/5
- Operational efficiency: avg ${scaleAvg("church_operations")}/5
- Should always disclose AI use: avg ${scaleAvg("church_disclosure")}/5
- Church currently has a clear position: avg ${scaleAvg("church_has_position")}/5

HOW SHOULD WE RESPOND:
- Who should lead: ${topValue("who_should_lead")}
- Formal policy needed: avg ${scaleAvg("formal_policy")}/5
- Concerned about mass unemployment: avg ${scaleAvg("unemployment_concern")}/5
- Should resist surveillance: avg ${scaleAvg("surveillance_resistance")}/5

FUTURE:
- AI has eschatological significance: avg ${scaleAvg("eschatological_significance")}/5
- Tegmark ranking (lower=more desirable): ${tegmarkRanking()}

OPEN TEXT RESPONSES: ${quotes || "None provided"}
`.trim();
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const { responses } = await request.json();
  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: "No responses provided" }, { status: 400 });
  }

  const summary = summariseResponses(responses);

  // ── Written recommendation ──────────────────────────────────────────────────
  const writtenPrompt = `You are a sharp strategic consultant with deep pastoral instincts. You have just analysed survey results from a group of Christians discussing AI. Produce a structured written analysis.

Use plain English. Be specific — reference actual scores and patterns from the data. Dry humour welcome but don't force it.

Format your response EXACTLY as follows using these section headings and bullet points. Use markdown: ## for headings, - for bullet points, **bold** for numbered recommendation headlines.

## Your Group's Tech Profile
- 3–4 dot points covering who is in the room, their tech comfort, and what AI tools they already use

## Where Personal Lines Are Drawn
- 3–4 dot points on how they personally use AI (including spiritual practices), what they consider off-limits, dependency concerns, and idolatry risk

## What the Church Should (and Shouldn't) Do
- 3–4 dot points covering the church appropriateness scores — which uses got high support, which got hesitation, and whether they think disclosure is important

## Who Should Lead the Response
- 2–3 dot points on who they think should lead, whether they want a formal policy, and how ready their church currently feels

## The Future They're Stewarding Toward
- 2–3 dot points on eschatological significance, the Tegmark outcome ranking (describe which futures they found most/least desirable), and any notable quotes from open text

## Our Recommendations
This is the most important section. Write 4–5 numbered recommendations. Each one has:
**1. Short punchy headline**
One to two sentences explaining what to do and why, directly tied to what this group's data revealed. Be specific and actionable. Don't be generic.

End with a Bible verse chosen specifically because it speaks to this group's unique combination of results. Quote a short portion, then one sentence connecting it directly to what this group showed.

Survey data:
${summary}`;

  // ── Spoken summary (~2 min, no score numbers) ────────────────────────────────
  const spokenPrompt = `You are a sharp, warm, witty AI assistant who just analysed survey data from a group of Christians discussing how their church should use AI. You need to deliver a spoken briefing of about 2 minutes (around 280–320 words when spoken aloud).

CRITICAL RULES:
- Do NOT mention any specific numbers, scores, averages, or percentages. No "3.4 out of 5" or "67% said". Speak in qualitative terms: "most of you", "the majority", "a strong lean toward", "a real hesitation around", "surprisingly few", etc.
- No headings, no lists — this is pure spoken word. Write it to be read aloud naturally.
- Sound like a smart, warm human friend who happens to know both strategy and theology. Conversational. A little funny when it fits.

STRUCTURE:
1. Open with a completely fresh, original riff on the irony of the situation — something like "Well, this is a curious moment — AI giving advice to humans on how to use AI" — then land a genuinely funny, light-hearted joke about this. Make it feel natural and spontaneous. Don't be cringe. Be clever.

2. Walk through the 5 insight areas conversationally in order:
   - Who is in the room and their tech background
   - What personal lines they're drawing
   - What the church should and shouldn't do
   - Who they think should lead the response and how ready they feel
   - The kind of future they're hoping for

3. Land on the most important recommendation or action for this group. Make it feel like a genuine, thoughtful conclusion — not a list.

4. Close with the same Bible verse used in the written analysis. Read a short portion of it naturally, then connect it to this group in one warm, human sentence.

Survey data:
${summary}`;

  const [writtenRes, spokenRes] = await Promise.all([
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: writtenPrompt }],
        max_tokens: 1200,
        temperature: 0.75,
      }),
    }),
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: spokenPrompt }],
        max_tokens: 500,
        temperature: 0.85,
      }),
    }),
  ]);

  if (!writtenRes.ok || !spokenRes.ok) {
    return NextResponse.json({ error: "OpenAI request failed" }, { status: 500 });
  }

  const [writtenData, spokenData] = await Promise.all([writtenRes.json(), spokenRes.json()]);

  const written = writtenData.choices[0]?.message?.content ?? "";
  const spoken = spokenData.choices[0]?.message?.content ?? "";

  return NextResponse.json({ written, spoken });
}
