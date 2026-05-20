"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RefreshCw, Users, ArrowLeft, Download } from "lucide-react";

interface Response {
  session_code: string;
  age_range: string;
  is_christian: string;
  denomination: string;
  role: string;
  tech_comfort: string;
  ai_tools: string;
  personal_spiritual_use: string;
  faith_impact: string;
  decision_dependency: string;
  personal_off_limits: string;
  off_limits_uses: string;
  idolatry_potential: string;
  church_sermon_prep: string;
  church_social_media: string;
  church_website: string;
  church_operations: string;
  church_disclosure: string;
  church_has_position: string;
  who_should_lead: string;
  formal_policy: string;
  unemployment_concern: string;
  surveillance_resistance: string;
  eschatological_significance: string;
  tegmark_rank_dictatorship: string;
  tegmark_rank_enslaved: string;
  tegmark_rank_enslaved_god: string;
  tegmark_rank_gatekeeper: string;
  tegmark_rank_zookeeper: string;
  tegmark_rank_libertarian: string;
  tegmark_rank_egalitarian: string;
  tegmark_rank_protector: string;
  final_vision: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countValues(responses: Response[], field: keyof Response): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of responses) {
    const val = (r[field] as string) || "No answer";
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function countMultiValues(responses: Response[], field: keyof Response): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of responses) {
    const raw = (r[field] as string) || "";
    const vals = raw.split(",").map(v => v.trim()).filter(Boolean);
    for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

function scaleAverage(responses: Response[], field: keyof Response): number | null {
  const nums = responses
    .map(r => r[field] as string)
    .filter(v => v && v !== "?" && v !== "No answer")
    .map(v => parseFloat(v))
    .filter(n => !isNaN(n));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─── Bar chart component ─────────────────────────────────────────────────────

function HorizontalBar({ label, value, max, color = "bg-blue-500", showCount = true }: {
  label: string; value: number; max: number; color?: string; showCount?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-gray-300 text-xs truncate max-w-[60%]">{label}</span>
        {showCount && <span className="text-gray-500 text-xs">{value}</span>}
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Scale bar (1-5 + ?) ─────────────────────────────────────────────────────

const SCALE_COLORS: Record<string, string> = {
  "1": "bg-red-500",
  "2": "bg-orange-400",
  "3": "bg-yellow-400",
  "4": "bg-blue-400",
  "5": "bg-green-500",
  "?": "bg-gray-600",
};

function ScaleQuestion({ title, responses, field }: {
  title: string; responses: Response[]; field: keyof Response;
}) {
  const counts = countValues(responses, field);
  const total = responses.length;
  const avg = scaleAverage(responses, field);
  const labels: Record<string, string> = {
    "1": "1 – Strongly Disagree", "2": "2 – Disagree", "3": "3 – Neutral",
    "4": "4 – Agree", "5": "5 – Strongly Agree", "?": "Not Sure",
  };
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between mb-3 gap-2">
        <p className="text-white text-sm font-medium leading-snug">{title}</p>
        {avg !== null && (
          <span className="shrink-0 bg-blue-900/40 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
            avg {avg.toFixed(1)}
          </span>
        )}
      </div>
      {["1", "2", "3", "4", "5", "?"].map(val => (
        <HorizontalBar
          key={val}
          label={labels[val]}
          value={counts[val] || 0}
          max={total}
          color={SCALE_COLORS[val]}
        />
      ))}
      <p className="text-gray-600 text-xs mt-2">{total} responses</p>
    </div>
  );
}

// ─── Appropriateness scale (Definitely Not → Definitely Yes) ─────────────────

function AppropriatenessQuestion({ title, responses, field }: {
  title: string; responses: Response[]; field: keyof Response;
}) {
  const counts = countValues(responses, field);
  const total = responses.length;
  const avg = scaleAverage(responses, field);
  const labels: Record<string, string> = {
    "1": "1 – Definitely Not", "2": "2 – Probably Not", "3": "3 – Maybe",
    "4": "4 – Probably Yes", "5": "5 – Definitely Yes", "?": "Not Sure",
  };
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between mb-3 gap-2">
        <p className="text-white text-sm font-medium leading-snug">{title}</p>
        {avg !== null && (
          <span className="shrink-0 bg-blue-900/40 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
            avg {avg.toFixed(1)}
          </span>
        )}
      </div>
      {["1", "2", "3", "4", "5", "?"].map(val => (
        <HorizontalBar
          key={val}
          label={labels[val]}
          value={counts[val] || 0}
          max={total}
          color={SCALE_COLORS[val]}
        />
      ))}
      <p className="text-gray-600 text-xs mt-2">{total} responses</p>
    </div>
  );
}

// ─── Breakdown (categorical) ──────────────────────────────────────────────────

function BreakdownChart({ title, counts, total, colors }: {
  title: string;
  counts: Record<string, number>;
  total: number;
  colors?: Record<string, string>;
}) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4">
      <p className="text-white text-sm font-medium mb-3">{title}</p>
      {sorted.map(([label, count]) => (
        <HorizontalBar
          key={label}
          label={label}
          value={count}
          max={total}
          color={colors?.[label] || "bg-blue-500"}
        />
      ))}
      <p className="text-gray-600 text-xs mt-2">{total} responses</p>
    </div>
  );
}

// ─── Tegmark ranking ──────────────────────────────────────────────────────────

function TegmarkResults({ responses }: { responses: Response[] }) {
  const outcomes = [
    { key: "tegmark_rank_dictatorship" as keyof Response, label: "AI Dictatorship" },
    { key: "tegmark_rank_enslaved" as keyof Response, label: "Enslaved AGI" },
    { key: "tegmark_rank_gatekeeper" as keyof Response, label: "Gatekeeper" },
    { key: "tegmark_rank_zookeeper" as keyof Response, label: "Zookeeper" },
    { key: "tegmark_rank_libertarian" as keyof Response, label: "Libertarian Utopia" },
    { key: "tegmark_rank_egalitarian" as keyof Response, label: "Egalitarian Utopia" },
    { key: "tegmark_rank_protector" as keyof Response, label: "Protector AGI" },
  ];

  // Lower average rank = more desirable
  const scored = outcomes.map(o => {
    const nums = responses
      .map(r => parseFloat(r[o.key] as string))
      .filter(n => !isNaN(n));
    const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 7;
    return { label: o.label, avg };
  }).sort((a, b) => a.avg - b.avg);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4">
      <p className="text-white text-sm font-medium mb-1">Tegmark Outcome Ranking</p>
      <p className="text-gray-500 text-xs mb-3">Average rank — lower = more desirable to this group</p>
      {scored.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3 mb-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            i === 0 ? "bg-green-600 text-white" : i >= 5 ? "bg-red-900/60 text-red-400" : "bg-gray-800 text-gray-400"
          }`}>{i + 1}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-gray-300 text-xs">{item.label}</span>
              <span className="text-gray-500 text-xs">{item.avg.toFixed(1)}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full">
              <div
                className={`h-full rounded-full ${i === 0 ? "bg-green-500" : i >= 5 ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${((7 - item.avg) / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Open text responses ──────────────────────────────────────────────────────

function OpenTextResponses({ responses }: { responses: Response[] }) {
  const texts = responses.map(r => r.final_vision).filter(Boolean);
  if (texts.length === 0) return null;
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4">
      <p className="text-white text-sm font-medium mb-3">
        "What is the most important thing the Church should do in response to AI?"
      </p>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {texts.map((t, i) => (
          <blockquote key={i} className="text-gray-300 text-xs leading-relaxed border-l-2 border-blue-800 pl-3 italic">
            "{t}"
          </blockquote>
        ))}
      </div>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-blue-400 font-mono text-xs font-bold">{num}</span>
        <h2 className="text-white text-lg font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkshopDisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [code, router]);

  const loadData = async () => {
    setLoading(true);
    const res = await fetch(`/api/workshops/results?code=${code}`);
    const data = await res.json();
    setResponses(Array.isArray(data) ? data : []);
    setLastFetched(new Date());
    setLoading(false);
  };

  const n = responses.length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/40 to-black" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm sticky top-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/leaders/workshops")} className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-blue-400 font-mono font-bold text-lg">{code}</span>
            <span className="flex items-center gap-1 text-gray-400 text-sm">
              <Users className="w-3.5 h-3.5" />
              {n} response{n !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-gray-600 text-xs hidden sm:block">
                Updated {lastFetched.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Process Data"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {n === 0 && !loading ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">No responses yet for this session.</p>
            <p className="text-gray-600 text-sm mt-1">Share the code <span className="text-blue-400 font-mono">{code}</span> with participants, then click Process Data.</p>
          </div>
        ) : (
          <>
            {/* ── Section 01: Who Are You? ── */}
            <SectionCard num="01" title="Who Are You?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BreakdownChart title="Age Range" counts={countValues(responses, "age_range")} total={n} />
                <BreakdownChart title="Do you identify as a Christian?" counts={countValues(responses, "is_christian")} total={n} />
                <BreakdownChart title="Denominational Tradition" counts={countValues(responses, "denomination")} total={n} />
                <BreakdownChart title="Role" counts={countValues(responses, "role")} total={n} />
              </div>
              <ScaleQuestion
                title="How comfortable are you with technology generally?"
                responses={responses}
                field="tech_comfort"
              />
              <BreakdownChart title="AI Tools Used" counts={countMultiValues(responses, "ai_tools")} total={n} />
            </SectionCard>

            {/* ── Section 02: Personal Line ── */}
            <SectionCard num="02" title="Where Do You Personally Draw the Line?">
              <ScaleQuestion title="I use AI in my personal spiritual practices (prayer, Bible study, devotions)" responses={responses} field="personal_spiritual_use" />
              <ScaleQuestion title="Overall, AI tools have had a positive impact on my faith" responses={responses} field="faith_impact" />
              <ScaleQuestion title="I am concerned about becoming too dependent on AI for thinking and decision-making" responses={responses} field="decision_dependency" />
              <ScaleQuestion title="There are uses of AI I personally consider off-limits" responses={responses} field="personal_off_limits" />
              <BreakdownChart title="Which uses are personally off-limits?" counts={countMultiValues(responses, "off_limits_uses")} total={n} />
              <ScaleQuestion title="AI has the potential to become something people worship or idolise" responses={responses} field="idolatry_potential" />
            </SectionCard>

            {/* ── Section 03: Church Line ── */}
            <SectionCard num="03" title="Where Do We As a Church Draw the Line?">
              <AppropriatenessQuestion title="The church should use AI to assist with sermon preparation" responses={responses} field="church_sermon_prep" />
              <AppropriatenessQuestion title="The church should use AI for social media content" responses={responses} field="church_social_media" />
              <AppropriatenessQuestion title="The church should use AI to help build and maintain its website" responses={responses} field="church_website" />
              <AppropriatenessQuestion title="The church should use AI for operational efficiency (e.g. attendance counting)" responses={responses} field="church_operations" />
              <ScaleQuestion title="AI-generated content used in church should always be disclosed to the congregation" responses={responses} field="church_disclosure" />
              <ScaleQuestion title="My church currently has a clear position on AI use" responses={responses} field="church_has_position" />
            </SectionCard>

            {/* ── Section 04: How Should We Respond? ── */}
            <SectionCard num="04" title="How Should We Respond?">
              <BreakdownChart title="Who should lead the Church's response to AI?" counts={countValues(responses, "who_should_lead")} total={n} />
              <ScaleQuestion title="The Church should develop a formal AI policy or ethical guideline" responses={responses} field="formal_policy" />
              <ScaleQuestion title="I am concerned about AI causing mass unemployment and economic disruption" responses={responses} field="unemployment_concern" />
              <ScaleQuestion title="Christians should be cautious and speak out against government use of AI for mass surveillance" responses={responses} field="surveillance_resistance" />
            </SectionCard>

            {/* ── Section 05: Future ── */}
            <SectionCard num="05" title="What Future Do We Want to Create?">
              <ScaleQuestion title="AI has significant relevance to how Christians should think about the end times" responses={responses} field="eschatological_significance" />
              <TegmarkResults responses={responses} />
              <OpenTextResponses responses={responses} />
            </SectionCard>
          </>
        )}
      </main>
    </div>
  );
}
