"use client";

import { Fragment, useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CheckCircle, Send, BookOpen, Users, Globe, AlertTriangle, Sparkles, GripVertical } from "lucide-react";
import {
  AGREE_SCALE,
  blankAnswers,
  SURVEY_SECTIONS,
  TEGMARK_OUTCOMES,
  type SurveyAnswers,
  type SurveyField,
  type SurveyOption,
  type SurveyQuestion,
} from "@/lib/domain/workshops/survey";
import { checkSessionCode, planSubmit, submitSurvey } from "@/lib/client/workshopSurvey";

// Section icons, in section order (01 to 05).
const SECTION_ICONS = [Users, BookOpen, Sparkles, Globe, AlertTriangle];

// Drag-and-drop (touch: arrow buttons) ranking of Tegmark's futures. Sends
// each outcome's rank, 1 to 7, whenever the order changes.
interface TegmarkRankingProps {
  onRankChange: (ranks: Partial<SurveyAnswers>) => void;
}

const tegmarkItems = TEGMARK_OUTCOMES;

function TegmarkRanking({ onRankChange }: TegmarkRankingProps) {
  const [items, setItems] = useState(tegmarkItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchItem, setTouchItem] = useState<string | null>(null);

  const updateRanks = (newItems: typeof tegmarkItems) => {
    const ranks: Partial<SurveyAnswers> = {};
    newItems.forEach((item, index) => {
      ranks[item.field] = (index + 1).toString();
    });
    onRankChange(ranks);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      const newItems = [...items];
      const draggedIndex = newItems.findIndex((item) => item.id === draggedItem);
      const targetIndex = newItems.findIndex((item) => item.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        setItems(newItems);
        updateRanks(newItems);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    setTouchItem(itemId);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent, targetId: string) => {
    e.preventDefault();
    if (touchItem && touchItem !== targetId && touchStartY !== null) {
      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY;
      
      // Swap if moved enough
      if (Math.abs(diff) > 30) {
        const newItems = [...items];
        const touchIndex = newItems.findIndex((item) => item.id === touchItem);
        const targetIndex = newItems.findIndex((item) => item.id === targetId);
        
        if (touchIndex !== -1 && targetIndex !== -1) {
          const [removed] = newItems.splice(touchIndex, 1);
          newItems.splice(targetIndex, 0, removed);
          setItems(newItems);
          updateRanks(newItems);
          setTouchStartY(touchY);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchItem(null);
    setTouchStartY(null);
  };

  // Move item up or down
  const moveItem = (itemId: string, direction: "up" | "down") => {
    const newItems = [...items];
    const currentIndex = newItems.findIndex((item) => item.id === itemId);
    
    if (currentIndex === -1) return;
    
    if (direction === "up" && currentIndex > 0) {
      const [removed] = newItems.splice(currentIndex, 1);
      newItems.splice(currentIndex - 1, 0, removed);
    } else if (direction === "down" && currentIndex < newItems.length - 1) {
      const [removed] = newItems.splice(currentIndex, 1);
      newItems.splice(currentIndex + 1, 0, removed);
    }
    
    setItems(newItems);
    updateRanks(newItems);
  };

  return (
    <div className="mb-8">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, item.id)}
            onTouchMove={(e) => handleTouchMove(e, item.id)}
            onTouchEnd={handleTouchEnd}
            className={`flex items-center gap-2 sm:gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-2 sm:p-3 cursor-move transition-all hover:bg-gray-700/50 active:scale-[0.98] touch-pan-y ${
              draggedItem === item.id || touchItem === item.id ? "opacity-50 bg-blue-900/30" : ""
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full text-white text-xs sm:text-sm font-bold shrink-0">
              {index + 1}
            </div>
            <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 shrink-0 hidden sm:block" />
            <div className="flex-1 min-w-0">
              <div className="text-gray-300 text-xs sm:text-sm font-medium">{item.label}</div>
              <div className="text-gray-500 text-[10px] sm:text-xs leading-tight">{item.desc}</div>
            </div>
            {/* Mobile arrow buttons */}
            <div className="flex flex-col gap-1 sm:hidden shrink-0">
              <button
                onClick={() => moveItem(item.id, "up")}
                disabled={index === 0}
                className="w-8 h-6 bg-gray-700 rounded flex items-center justify-center text-white disabled:opacity-30 active:bg-blue-600"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                onClick={() => moveItem(item.id, "down")}
                disabled={index === items.length - 1}
                className="w-8 h-6 bg-gray-700 rounded flex items-center justify-center text-white disabled:opacity-30 active:bg-blue-600"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-gray-500 text-xs mt-3 sm:hidden">
        Tap ▲ ▼ buttons to reorder, or drag on desktop
      </p>
    </div>
  );
}

export default function StewardshipSurvey() {
  const [currentStep, setCurrentStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const [surveyData, setSurveyData] = useState<SurveyAnswers>(blankAnswers);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitNeedsCode, setSubmitNeedsCode] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [sessionCodeError, setSessionCodeError] = useState("");
  const [sessionCodeSuggestion, setSessionCodeSuggestion] = useState("");
  const [sessionCodeValid, setSessionCodeValid] = useState(false);
  const [sessionCodeChecking, setSessionCodeChecking] = useState(false);
  const [includeLife3, setIncludeLife3] = useState(true);

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const totalSteps = 6; // Intro + 5 survey steps

  const updateSurveyData = (field: SurveyField, value: string | string[]) => {
    setSurveyData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: SurveyField, value: string) => {
    setSurveyData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const validateSessionCode = async (code: string) => {
    setSessionCodeError("");
    setSessionCodeSuggestion("");
    if (!code.trim()) return;
    setSessionCodeChecking(true);
    const check = await checkSessionCode(code);
    setSessionCodeChecking(false);
    if (check.kind === "valid") {
      setSessionCode(check.code);
      setSessionCodeValid(true);
      setSessionCodeError("");
      setIncludeLife3(check.includeLife3);
    } else if (check.kind === "invalid") {
      setSessionCodeValid(false);
      setSessionCode("");
      setSessionCodeError(check.error);
      if (check.suggestion) setSessionCodeSuggestion(check.suggestion);
    } else {
      // Rate limited, server down or offline: say so, and leave the code
      // as it was rather than treating it as wrong.
      setSessionCodeError(check.error);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitNeedsCode(false);
    const plan = planSubmit(sessionCode, sessionCodeInput);
    if (plan === "needCode") {
      setSubmitNeedsCode(true);
      setSubmitError("Your workshop session code isn't confirmed yet, so your answers were not saved. Go back to the start, tap Check next to the code, then submit again. Your answers are kept.");
      return;
    }
    if (plan === "skip") {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitSurvey(sessionCode, surveyData);
      if (result.ok) setSubmitted(true);
      else setSubmitError(result.error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderLikertScale = (
    question: string,
    field: SurveyField,
    options: SurveyOption[] = AGREE_SCALE
  ) => (
    <div className="mb-8">
      <p className="text-white text-sm sm:text-base md:text-lg mb-3 sm:mb-4 font-medium">{question}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => updateSurveyData(field, option.value)}
            className={`p-2 sm:p-3 rounded-lg text-xs transition-all duration-200 ${
              option.value === "?"
                ? surveyData[field] === option.value
                  ? "bg-gray-500 text-white col-span-1"
                  : "bg-gray-800/30 text-gray-500 border border-gray-700 hover:bg-gray-700/30 col-span-1"
                : surveyData[field] === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/50 text-gray-300 border border-gray-700 hover:bg-gray-700/50"
            }`}
          >
            <span className="block font-bold mb-0.5">{option.value}</span>
            <span className="block text-[10px] leading-tight">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCheckboxGroup = (
    question: string,
    field: SurveyField,
    options: SurveyOption[]
  ) => (
    <div className="mb-8">
      <p className="text-white text-base md:text-lg mb-4 font-medium">{question}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((option) => {
          const isSelected = (surveyData[field] as string[]).includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => toggleArrayValue(field, option.value)}
              className={`p-3 rounded-lg text-xs sm:text-sm transition-all duration-200 text-left ${
                isSelected
                  ? "bg-blue-600/80 text-white border-blue-500"
                  : "bg-gray-800/50 text-gray-300 border border-gray-700 hover:bg-gray-700/50"
              }`}
            >
              <span className="flex items-start gap-2">
                <span className={`w-4 h-4 rounded border shrink-0 mt-0.5 ${isSelected ? "bg-white border-white" : "border-gray-500"} flex items-center justify-center`}>
                  {isSelected && <CheckCircle size={12} className="text-blue-600" />}
                </span>
                <span className="leading-tight">{option.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTextArea = (
    question: string,
    field: SurveyField,
    placeholder: string,
    required = false
  ) => (
    <div className="mb-8">
      <p className="text-white text-sm sm:text-base md:text-lg mb-3 sm:mb-4 font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </p>
      <textarea
        value={surveyData[field] as string}
        onChange={(e) => updateSurveyData(field, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 sm:p-4 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
      />
    </div>
  );

  const renderSelect = (
    question: string,
    field: SurveyField,
    options: SurveyOption[]
  ) => (
    <div className="mb-6">
      <p className="text-white text-sm sm:text-base md:text-lg mb-2 sm:mb-3 font-medium">{question}</p>
      <select
        value={surveyData[field] as string}
        onChange={(e) => updateSurveyData(field, e.target.value)}
        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 transition-colors"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderQuestion = (q: SurveyQuestion) => {
    switch (q.kind) {
      case "select":
        return renderSelect(q.question, q.field, q.options);
      case "scale":
        return renderLikertScale(q.question, q.field, q.options);
      case "multi":
        return renderCheckboxGroup(q.question, q.field, q.options);
      case "text":
        return renderTextArea(q.question, q.field, q.placeholder, q.required);
      case "ranking":
        if (!includeLife3) return null;
        return (
          <>
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 mb-6 mt-4">
              <h4 className="text-white text-sm font-semibold mb-2 uppercase tracking-wider">Context from the culture</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                In <em>Life 3.0</em>, Max Tegmark describes <strong className="text-white">AGI (Artificial General Intelligence)</strong>: AI that can perform any intellectual task a human can, with the potential to recursively improve itself. He outlines seven possible futures for humanity if AGI emerges.
              </p>
              <p className="text-gray-400 text-xs italic">
                Drag the cards below to rank from most desirable (1) to least desirable (7). Which future are we stewarding toward?
              </p>
            </div>

            <TegmarkRanking onRankChange={(ranks) => setSurveyData((prev) => ({ ...prev, ...ranks }))} />
          </>
        );
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                Christians & AI: A Study in Technological Stewardship
              </h2>
              <p className="text-gray-300 text-base sm:text-lg mb-6 leading-relaxed italic">
                &ldquo;The earth is the Lord&apos;s, and everything in it.&rdquo; &ndash; Psalm 24:1
              </p>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
                AI is reshaping how we work, relate, worship and think. This survey asks how Christians are engaging with it, and what the Church should do next. No technical knowledge required. All answers are anonymous.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {SURVEY_SECTIONS.map((section) => (
                <div key={section.num} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-blue-400 text-xs font-mono font-bold mb-1">{section.num}</div>
                  <div className="text-white text-sm font-semibold mb-1">{section.cardTitle}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{section.cardDescription}</div>
                </div>
              ))}
            </div>

            <div className="max-w-sm mx-auto mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Workshop Session Code
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionCodeInput}
                  onChange={(e) => {
                    setSessionCodeInput(e.target.value.toUpperCase());
                    // Only a code confirmed by Check is ever submitted.
                    setSessionCode("");
                    setSessionCodeValid(false);
                    setSessionCodeError("");
                    setSessionCodeSuggestion("");
                  }}
                  onBlur={() => validateSessionCode(sessionCodeInput)}
                  placeholder="e.g. GUINEAPIG"
                  className={`flex-1 bg-gray-800/60 border rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-600 focus:outline-none transition-colors uppercase ${
                    sessionCodeValid
                      ? "border-green-500 focus:border-green-400"
                      : sessionCodeError
                        ? "border-red-500 focus:border-red-400"
                        : "border-gray-700 focus:border-blue-500"
                  }`}
                />
                <button
                  onClick={() => validateSessionCode(sessionCodeInput)}
                  disabled={sessionCodeChecking || !sessionCodeInput.trim()}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs transition-colors"
                >
                  {sessionCodeChecking ? "..." : "Check"}
                </button>
              </div>
              {sessionCodeValid && (
                <p className="text-green-400 text-xs mt-1.5">&#10003; Session <span className="font-mono font-bold">{sessionCode}</span> confirmed</p>
              )}
              {sessionCodeError && (
                <div className="mt-1.5">
                  <p className="text-red-400 text-xs">{sessionCodeError}</p>
                  {sessionCodeSuggestion && (
                    <button
                      onClick={() => {
                        setSessionCodeInput(sessionCodeSuggestion);
                        validateSessionCode(sessionCodeSuggestion);
                      }}
                      className="text-blue-400 text-xs underline mt-0.5"
                    >
                      Use &ldquo;{sessionCodeSuggestion}&rdquo; instead
                    </button>
                  )}
                </div>
              )}
              <p className="text-gray-600 text-xs mt-1.5">Leave blank if you&apos;re taking this independently</p>
            </div>

            <div className="max-w-sm mx-auto mb-6 bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs leading-relaxed">
                <span className="text-white font-semibold">Privacy notice:</span> All responses are anonymous. No names, emails, or identifying information are collected. Data is used solely within this workshop session for group discussion purposes and is handled in accordance with fair information collection principles. By participating you consent to this use.{" "}
                <a
                  href="https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/collection-of-personal-information"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Learn more
                </a>
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={() => goToStep(1)}
                className="bg-blue-700 hover:bg-blue-600 text-white px-10 py-4 rounded-full font-medium transition-colors text-lg"
              >
                Begin Survey
              </button>
              <p className="text-gray-500 text-sm mt-4">Takes approx. 10 minutes &bull; 5 sections &bull; 25 questions</p>
            </div>
          </div>
        );

      default: {
        const section = SURVEY_SECTIONS[currentStep - 1];
        if (!section) return null;
        const Icon = SECTION_ICONS[currentStep - 1];
        return (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-0.5">Section {section.num}</p>
                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">{section.title}</h3>
              </div>
            </div>
            {section.intro && <p className="text-gray-400 text-sm mb-6">{section.intro}</p>}

            {section.questions.map((q, i) => (
              <Fragment key={q.kind === "ranking" ? `ranking-${i}` : q.field}>{renderQuestion(q)}</Fragment>
            ))}
          </div>
        );
      }
    }
  };

  if (submitted) {
    return (
      <>
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Thank You for Your Contribution
          </h2>
          <p className="text-gray-300 text-lg mb-6">
            Your responses will help shape the Church&apos;s understanding of AI and inform guidance for believers worldwide.
          </p>
          <p className="text-gray-400 mb-8">
            A research report based on these findings will be shared with denominations, church conferences, and ministry leaders.
          </p>
          <button
            onClick={() => {
              setCurrentStep(0);
              setSubmitted(false);
              setSurveyData(blankAnswers());
            }}
            className="bg-blue-700 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-medium transition-colors"
          >
            Submit Another Response
          </button>
        </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] w-full overflow-hidden">
        <Image
          src="/images/streetlights_stary_sky.png"
          alt="Starry sky"
          fill
          sizes="100vw"
          className="object-cover opacity-60"
          preload
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              TECHNOLOGICAL STEWARDSHIP
            </h1>
            <p className="text-gray-300 text-base md:text-xl max-w-2xl mx-auto italic">
              &ldquo;The earth is the Lord&apos;s, and everything in it...&rdquo; &ndash; Psalm 24:1
            </p>
          </div>
        </div>
      </section>

      {/* Survey Section */}
      <section ref={topRef} className="py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          {currentStep > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">
                  Step {currentStep} of {totalSteps - 1}
                </span>
                <span className="text-gray-400 text-sm">
                  {Math.round(((currentStep - 1) / (totalSteps - 2)) * 100)}% complete
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((currentStep - 1) / (totalSteps - 2)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Survey Content */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-10">
            {renderStep()}

            {/* Navigation Buttons */}
            {currentStep > 0 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                <button
                  onClick={() => goToStep(currentStep - 1)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  disabled={currentStep === 0}
                >
                  <ChevronLeft size={20} />
                  Back
                </button>

                {currentStep < totalSteps - 1 ? (
                  <button
                    onClick={() => goToStep(currentStep + 1)}
                    className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                  >
                    Continue
                    <ChevronRight size={20} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white px-8 py-3 rounded-full font-medium transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit Survey"}
                    <Send size={20} />
                  </button>
                )}
              </div>
            )}

            {submitError && currentStep === totalSteps - 1 && (
              <div role="alert" className="mt-4 rounded-lg border border-red-500/60 bg-red-950/40 p-4 text-sm text-red-200">
                <p>{submitError}</p>
                <button
                  onClick={() => {
                    if (submitNeedsCode) {
                      setSubmitError("");
                      setSubmitNeedsCode(false);
                      goToStep(0);
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={submitting}
                  className="mt-3 rounded-full bg-red-700 px-5 py-2 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {submitNeedsCode ? "Go to the session code" : submitting ? "Trying again..." : "Try again"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-400 text-sm">
            Questions about this research? Contact{" "}
            <a href="mailto:info@avenuemission.com" className="text-blue-400 hover:text-blue-300">
              info@avenuemission.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
