"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/client/auth";
import { leaderFetch } from "@/lib/client/leaderFetch";
import { RefreshCw, Users, ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, Volume2, Square, RotateCcw, Download, FileText } from "lucide-react";

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
  neighbour_principle: string;
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

// ─── Collapsible section card ─────────────────────────────────────────────────

function SectionCard({
  id, num, title, children, open, onToggle,
}: {
  id: string; num: string; title: string; children: React.ReactNode;
  open: boolean; onToggle: () => void;
}) {
  return (
    <div id={id} className="mb-4 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-900/60 hover:bg-gray-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-mono text-xs font-bold">{num}</span>
          <h2 className="text-white text-base font-bold">{title}</h2>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-5 py-5">{children}</div>}
    </div>
  );
}

// ─── Privacy toggle ───────────────────────────────────────────────────────────

function PrivacyToggle({ label, visible, onToggle }: { label: string; visible: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        visible
          ? "border-yellow-700/50 bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30"
          : "border-gray-700 bg-gray-800/40 text-gray-500 hover:bg-gray-800/60"
      }`}
    >
      {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "s01", num: "01", title: "Who Are You?" },
  { id: "s02", num: "02", title: "Your Personal Line" },
  { id: "s03", num: "03", title: "The Church's Line" },
  { id: "s04", num: "04", title: "How Should We Respond?" },
  { id: "s05", num: "05", title: "What Future?" },
  { id: "s06", num: "06", title: "AI Recommendation" },
];

export default function WorkshopDisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    s01: true, s02: false, s03: false, s04: false, s05: false, s06: false,
  });
  // AI recommendation state
  const [aiWritten, setAiWritten] = useState("");
  const [aiSpoken, setAiSpoken] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Privacy toggles — hidden by default
  const [showAge, setShowAge] = useState(false);
  const [showChristian, setShowChristian] = useState(false);
  const [showDenomination, setShowDenomination] = useState(false);
  const [includeLife3, setIncludeLife3] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [code, router]);

  const loadData = async () => {
    setLoading(true);
    const [resultsRes, sessionRes] = await Promise.all([
      leaderFetch(`/api/workshops/results?code=${code}`),
      leaderFetch(`/api/workshops/sessions`),
    ]);
    const resultsData = await resultsRes.json();
    const sessionsData = await sessionRes.json();
    setResponses(Array.isArray(resultsData) ? resultsData : []);
    // Find current session settings
    const session = Array.isArray(sessionsData) ? sessionsData.find((s: any) => s.code === code) : null;
    setIncludeLife3(session?.include_life_3 !== false);
    setLastFetched(new Date());
    setLoading(false);
  };

  const toggleSection = (id: string) =>
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const scrollTo = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: true }));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const n = responses.length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/40 to-black" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm sticky top-0 bg-black/80">
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

        {/* Section nav */}
        {n > 0 && (
          <div className="border-t border-gray-800/50 overflow-x-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 py-2">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    openSections[s.id]
                      ? "bg-blue-600/20 text-blue-300 border border-blue-700/40"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
                  }`}
                >
                  <span className="font-mono text-[10px]">{s.num}</span>
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {n === 0 && !loading ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">No responses yet for this session.</p>
            <p className="text-gray-600 text-sm mt-1">Share the code <span className="text-blue-400 font-mono">{code}</span> with participants, then click Process Data.</p>
          </div>
        ) : (
          <>
            {/* ── Section 01: Who Are You? ── */}
            <SectionCard id="s01" num="01" title="Who Are You?"
              open={openSections.s01} onToggle={() => toggleSection("s01")}
            >
              {/* Privacy controls */}
              <div className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-gray-800">
                <span className="text-gray-500 text-xs self-center mr-1">Private fields:</span>
                <PrivacyToggle label="Age Range" visible={showAge} onToggle={() => setShowAge(v => !v)} />
                <PrivacyToggle label="Christian?" visible={showChristian} onToggle={() => setShowChristian(v => !v)} />
                <PrivacyToggle label="Denomination" visible={showDenomination} onToggle={() => setShowDenomination(v => !v)} />
              </div>

              {showAge && <BreakdownChart title="Age Range" counts={countValues(responses, "age_range")} total={n} />}
              {showChristian && <BreakdownChart title="Do you identify as a Christian?" counts={countValues(responses, "is_christian")} total={n} />}
              {showDenomination && <BreakdownChart title="Denominational Tradition" counts={countValues(responses, "denomination")} total={n} />}

              {!showAge && !showChristian && !showDenomination && (
                <p className="text-gray-600 text-xs italic mb-4">Age, faith, and denomination data is hidden. Toggle above to reveal.</p>
              )}

              <BreakdownChart title="Role" counts={countValues(responses, "role")} total={n} />
              <ScaleQuestion title="How comfortable are you with technology generally?" responses={responses} field="tech_comfort" />
              <BreakdownChart title="AI Tools Used" counts={countMultiValues(responses, "ai_tools")} total={n} />
            </SectionCard>

            {/* ── Section 02: Personal Line ── */}
            <SectionCard id="s02" num="02" title="Where Do You Personally Draw the Line?"
              open={openSections.s02} onToggle={() => toggleSection("s02")}
            >
              <ScaleQuestion title="I use AI in my personal spiritual practices (prayer, Bible study, devotions)" responses={responses} field="personal_spiritual_use" />
              <ScaleQuestion title="Overall, AI tools have had a positive impact on my faith" responses={responses} field="faith_impact" />
              <ScaleQuestion title="I am concerned about becoming too dependent on AI for thinking and decision-making" responses={responses} field="decision_dependency" />
              <ScaleQuestion title="There are uses of AI I personally consider off-limits" responses={responses} field="personal_off_limits" />
              <BreakdownChart title="Which uses are personally off-limits?" counts={countMultiValues(responses, "off_limits_uses")} total={n} />
              <ScaleQuestion title="AI has the potential to become something people worship or idolise" responses={responses} field="idolatry_potential" />
              <AppropriatenessQuestion title="Does the principle Jesus taught — to love your neighbour as yourself — currently apply, or will it ever apply, to how we treat AI?" responses={responses} field="neighbour_principle" />
            </SectionCard>

            {/* ── Section 03: Church Line ── */}
            <SectionCard id="s03" num="03" title="Where Do We As a Church Draw the Line?"
              open={openSections.s03} onToggle={() => toggleSection("s03")}
            >
              <AppropriatenessQuestion title="The church should use AI to assist with sermon preparation" responses={responses} field="church_sermon_prep" />
              <AppropriatenessQuestion title="The church should use AI for social media content" responses={responses} field="church_social_media" />
              <AppropriatenessQuestion title="The church should use AI to help build and maintain its website" responses={responses} field="church_website" />
              <AppropriatenessQuestion title="The church should use AI for operational efficiency (e.g. attendance counting)" responses={responses} field="church_operations" />
              <ScaleQuestion title="AI-generated content used in church should always be disclosed to the congregation" responses={responses} field="church_disclosure" />
              <ScaleQuestion title="My church currently has a clear position on AI use" responses={responses} field="church_has_position" />
            </SectionCard>

            {/* ── Section 04: How Should We Respond? ── */}
            <SectionCard id="s04" num="04" title="How Should We Respond?"
              open={openSections.s04} onToggle={() => toggleSection("s04")}
            >
              <BreakdownChart title="Who should lead the Church's response to AI?" counts={countValues(responses, "who_should_lead")} total={n} />
              <ScaleQuestion title="The Church should develop a formal AI policy or ethical guideline" responses={responses} field="formal_policy" />
              <ScaleQuestion title="I am concerned about AI causing mass unemployment and economic disruption" responses={responses} field="unemployment_concern" />
              <ScaleQuestion title="Christians should be cautious and speak out against government use of AI for mass surveillance" responses={responses} field="surveillance_resistance" />
            </SectionCard>

            {/* ── Section 05: Future ── */}
            <SectionCard id="s05" num="05" title="What Future Do We Want to Create?"
              open={openSections.s05} onToggle={() => toggleSection("s05")}
            >
              <ScaleQuestion title="AI has significant relevance to how Christians should think about the end times" responses={responses} field="eschatological_significance" />
              {includeLife3 && <TegmarkResults responses={responses} />}
              <OpenTextResponses responses={responses} />
            </SectionCard>

            {/* ── Section 06: AI Recommendation ── */}
            <SectionCard id="s06" num="06" title="AI Recommendation About AI"
              open={openSections.s06} onToggle={() => toggleSection("s06")}
            >
              <AiRecommendationSection
                responses={responses}
                written={aiWritten}
                spoken={aiSpoken}
                loading={aiLoading}
                error={aiError}
                audioUrl={audioUrl}
                audioPlaying={audioPlaying}
                audioFinished={audioFinished}
                audioRef={audioRef}
                sessionCode={code}
                onGenerate={async () => {
                  setAiLoading(true);
                  setAiError("");
                  setAiWritten("");
                  setAiSpoken("");
                  setAudioUrl("");
                  setAudioPlaying(false);
                  setAudioFinished(false);
                  // Stop any existing audio
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  try {
                    const recRes = await leaderFetch("/api/workshops/ai-recommendation", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ responses }),
                    });
                    if (!recRes.ok) throw new Error("Recommendation failed");
                    const { written, spoken } = await recRes.json();
                    setAiWritten(written);
                    setAiSpoken(spoken);
                    // Generate audio
                    const ttsRes = await leaderFetch("/api/workshops/ai-speak", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: spoken }),
                    });
                    if (!ttsRes.ok) throw new Error("TTS failed");
                    const blob = await ttsRes.blob();
                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);
                    // Auto-play
                    const audio = new Audio(url);
                    audioRef.current = audio;
                    audio.onplay = () => { setAudioPlaying(true); setAudioFinished(false); };
                    audio.onended = () => { setAudioPlaying(false); setAudioFinished(true); };
                    audio.onpause = () => setAudioPlaying(false);
                    audio.play();
                  } catch (e) {
                    setAiError("Something went wrong generating the recommendation. Try again.");
                    console.error(e);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                onStop={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } setAudioPlaying(false); }}
                onReplay={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } }}
              />
            </SectionCard>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Markdown renderer for AI written analysis ───────────────────────────────

function MarkdownAnalysis({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  const renderInline = (str: string, key: number): React.ReactNode => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
            : p
        )}
      </span>
    );
  };

  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 mb-4 pl-1">
          {bulletBuffer.map((b, i) => (
            <li key={i} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
              <span className="text-blue-400 mt-1 shrink-0">•</span>
              <span>{renderInline(b, i)}</span>
            </li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushBullets();
      const heading = trimmed.slice(3);
      const isRec = heading.toLowerCase().includes("recommendation");
      elements.push(
        <h3 key={`h-${i}`} className={`font-bold text-sm mt-5 mb-2 pb-1 border-b ${
          isRec
            ? "text-blue-300 border-blue-800"
            : "text-white border-gray-800"
        }`}>
          {heading}
        </h3>
      );
    } else if (trimmed.startsWith("- ")) {
      bulletBuffer.push(trimmed.slice(2));
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${i}`} className="text-gray-300 text-sm leading-relaxed mb-3">
          {renderInline(trimmed, i)}
        </p>
      );
    }
  });
  flushBullets();

  return <div>{elements}</div>;
}

// ─── AI Recommendation Section ───────────────────────────────────────────────

function AiRecommendationSection({
  responses, written, spoken, loading, error, audioUrl, audioPlaying, audioFinished,
  audioRef, onGenerate, onStop, onReplay, sessionCode,
}: {
  responses: Response[];
  written: string; spoken: string; loading: boolean; error: string;
  audioUrl: string; audioPlaying: boolean; audioFinished: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onGenerate: () => void; onStop: () => void; onReplay: () => void;
  sessionCode: string;
}) {
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Recommendation - ${sessionCode}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #2563eb; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    h3 { color: #374151; margin-top: 20px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    strong { color: #1f2937; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 30px; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <h1>AI Recommendation Report</h1>
  <div class="meta">Session: ${sessionCode} | Generated: ${new Date().toLocaleString()}</div>
  ${written.replace(/## /g, "<h2>").replace(/\n- /g, "\n<li>").replace(/\n\n/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}
</body>
</html>`;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 100);
  };

  const handleDownloadMP3 = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `${sessionCode}-ai-recommendation.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const hasResult = !!written;

  return (
    <div>
      {/* Intro */}
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">
        Click Generate to have AI analyse your group&apos;s survey results and produce a strategic recommendation —
        then it will speak a punchy summary to the room.
      </p>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={loading || responses.length === 0}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all mb-6"
      >
        <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Thinking..." : hasResult ? "Regenerate" : "Generate Recommendation"}
      </button>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3 mb-6">
          <div className="h-3 bg-gray-800 rounded-full animate-pulse w-full" />
          <div className="h-3 bg-gray-800 rounded-full animate-pulse w-5/6" />
          <div className="h-3 bg-gray-800 rounded-full animate-pulse w-4/6" />
          <p className="text-gray-600 text-xs mt-2">Analysing {responses.length} responses across 5 sections...</p>
        </div>
      )}

      {/* Written recommendation */}
      {hasResult && !loading && (
        <>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-5">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-4">Written Analysis</p>
            <MarkdownAnalysis text={written} />
          </div>

          {/* Audio controls */}
          {audioUrl && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
              audioPlaying
                ? "bg-purple-900/20 border-purple-700/40"
                : "bg-gray-900/40 border-gray-800"
            }`}>
              {audioPlaying ? (
                <>
                  <div className="flex gap-0.5 items-end h-5">
                    {[1,2,3,4,3,2,1].map((h, i) => (
                      <div key={i}
                        className="w-1 bg-purple-400 rounded-full animate-pulse"
                        style={{ height: `${h * 4}px`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-purple-300 text-xs font-medium flex-1">Speaking...</span>
                  <button onClick={onStop}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500 text-xs flex-1">
                    {audioFinished ? "Finished speaking" : "Ready to speak"}
                  </span>
                  <button onClick={onReplay}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Replay
                  </button>
                </>
              )}
            </div>
          )}

          {/* Download buttons */}
          {hasResult && !loading && (
            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-800">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 text-xs text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Download PDF Report
              </button>
              {audioUrl && (
                <button
                  onClick={handleDownloadMP3}
                  className="flex items-center gap-2 text-xs text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700 px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Audio ({sessionCode}-ai-recommendation.mp3)
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
