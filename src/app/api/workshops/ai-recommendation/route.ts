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
  const writtenPrompt = `You are a sharp strategic consultant who also has deep pastoral instincts. You've just received survey data from a group of Christians discussing AI. Analyse this data and give a clear, practical recommendation.

Be direct and human. Use plain English. Avoid jargon. Occasional dry humour is welcome — but don't force it. No bullet points. Write in flowing paragraphs. Do NOT use markdown formatting.

Structure your response as:
1. What the data actually says (2–3 key observations about this specific group — be specific, reference actual numbers)
2. What they should do (3 concrete, actionable recommendations for their church — specific and realistic)
3. A closing Bible verse chosen specifically because it speaks to this group's unique results — quote a short portion of it, then in one sentence connect it directly to what this group's data showed.

Keep it under 350 words total.

Survey data:
${summary}`;

  // ── Spoken summary ──────────────────────────────────────────────────────────
  const spokenPrompt = `You are a sharp, warm AI assistant who just analysed survey data from a group of Christians discussing AI. You need to give a 45-second spoken summary.

Start with something like: "I'll save you the trouble of reading through all of that — here's what I'm actually thinking."

Then give the 2 most interesting or surprising things you noticed about this specific group's data (be specific — reference actual numbers or patterns). Then give your single most important recommendation. End with the same Bible verse from the written analysis and one natural sentence connecting it to them.

Sound like a smart human friend who happens to know strategy and theology. A little bit funny is good. Conversational, not formal. No lists, no headings — just talk. Under 120 words.

Survey data:
${summary}`;

  const [writtenRes, spokenRes] = await Promise.all([
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: writtenPrompt }],
        max_tokens: 600,
        temperature: 0.75,
      }),
    }),
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: spokenPrompt }],
        max_tokens: 250,
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
