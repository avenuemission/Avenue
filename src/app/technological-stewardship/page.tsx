"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CheckCircle, Send, BookOpen, Users, Globe, AlertTriangle, Sparkles, GripVertical } from "lucide-react";

// Survey data structure
interface SurveyData {
  // Section 1: Who Are You?
  ageRange: string;
  isChristian: string;
  denomination: string;
  role: string;
  techComfort: string;
  aiTools: string[];

  // Section 2: Where Do You Personally Draw the Line?
  personalSpiritualUse: string;
  faithImpact: string;
  decisionDependency: string;
  personalOffLimits: string;
  offLimitsUses: string[];
  idolatryPotential: string;

  // Section 3: Where Do We As a Church Draw the Line?
  churchSermonPrep: string;
  churchSocialMedia: string;
  churchWebsite: string;
  churchOperations: string;
  churchDisclosure: string;
  churchHasPosition: string;

  // Section 4: How Should We Respond?
  whoShouldLead: string;
  formalPolicy: string;
  unemploymentConcern: string;
  surveillanceResistance: string;

  // Section 5: What Future Do We Want to Create?
  eschatologicalSignificance: string;
  tegmarkRankDictatorship: string;
  tegmarkRankEnslaved: string;
  tegmarkRankGatekeeper: string;
  tegmarkRankZookeeper: string;
  tegmarkRankLibertarian: string;
  tegmarkRankEgalitarian: string;
  tegmarkRankProtector: string;
  finalVision: string;
}

const initialSurveyData: SurveyData = {
  // Section 1
  ageRange: "",
  isChristian: "",
  denomination: "",
  role: "",
  techComfort: "",
  aiTools: [],
  // Section 2
  personalSpiritualUse: "",
  faithImpact: "",
  decisionDependency: "",
  personalOffLimits: "",
  offLimitsUses: [],
  idolatryPotential: "",
  // Section 3
  churchSermonPrep: "",
  churchSocialMedia: "",
  churchWebsite: "",
  churchOperations: "",
  churchDisclosure: "",
  churchHasPosition: "",
  // Section 4
  whoShouldLead: "",
  formalPolicy: "",
  unemploymentConcern: "",
  surveillanceResistance: "",
  // Section 5
  eschatologicalSignificance: "",
  tegmarkRankDictatorship: "",
  tegmarkRankEnslaved: "",
  tegmarkRankGatekeeper: "",
  tegmarkRankZookeeper: "",
  tegmarkRankLibertarian: "",
  tegmarkRankEgalitarian: "",
  tegmarkRankProtector: "",
  finalVision: "",
};

// Likert scale options — 1-5 + unsure
const likertOptions = [
  { value: "1", label: "Strongly Disagree" },
  { value: "2", label: "Disagree" },
  { value: "3", label: "Neutral" },
  { value: "4", label: "Agree" },
  { value: "5", label: "Strongly Agree" },
  { value: "?", label: "Not Sure" },
];

const appropriatenessOptions = [
  { value: "1", label: "Definitely Not" },
  { value: "2", label: "Probably Not" },
  { value: "3", label: "Maybe" },
  { value: "4", label: "Probably Yes" },
  { value: "5", label: "Definitely Yes" },
  { value: "?", label: "Not Sure" },
];

// Tegmark Ranking Component with drag-and-drop
interface TegmarkRankingProps {
  onRankChange: (ranks: {
    dictatorship: string;
    enslaved: string;
    gatekeeper: string;
    zookeeper: string;
    libertarian: string;
    egalitarian: string;
    protector: string;
  }) => void;
}

const tegmarkItems = [
  { id: "dictatorship", label: "AI Dictatorship", desc: "Concentrated power where AI serves a totalitarian regime controlling all aspects of life." },
  { id: "enslaved", label: "Enslaved AGI", desc: "Superintelligent AI exists but is controlled by a small elite who monopolize its benefits." },
  { id: "gatekeeper", label: "Gatekeeper", desc: "Strict global regulation prevents AGI development, maintaining status quo but limiting progress." },
  { id: "zookeeper", label: "Zookeeper", desc: "AI manages humanity much like we manage animals in zoos—kept comfortable but controlled." },
  { id: "libertarian", label: "Libertarian Utopia", desc: "Free market AI where individuals and corporations compete, creating wealth but also inequality." },
  { id: "egalitarian", label: "Egalitarian Utopia", desc: "AI benefits are shared equally across humanity, eliminating poverty and class divides." },
  { id: "protector", label: "Protector AGI", desc: "Benevolent AI acts as a guardian, guiding humanity toward flourishing while respecting freedom." },
];

function TegmarkRanking({ onRankChange }: TegmarkRankingProps) {
  const [items, setItems] = useState(tegmarkItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchItem, setTouchItem] = useState<string | null>(null);

  const updateRanks = (newItems: typeof tegmarkItems) => {
    const ranks: Record<string, string> = {};
    newItems.forEach((item, index) => {
      ranks[item.id] = (index + 1).toString();
    });
    onRankChange({
      dictatorship: ranks.dictatorship || "",
      enslaved: ranks.enslaved || "",
      gatekeeper: ranks.gatekeeper || "",
      zookeeper: ranks.zookeeper || "",
      libertarian: ranks.libertarian || "",
      egalitarian: ranks.egalitarian || "",
      protector: ranks.protector || "",
    });
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

export default function TechnologicalStewardshipPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [surveyData, setSurveyData] = useState<SurveyData>(initialSurveyData);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 6; // Intro + 5 survey steps

  const updateSurveyData = (field: keyof SurveyData, value: string | string[]) => {
    setSurveyData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: keyof SurveyData, value: string) => {
    setSurveyData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Submit to Netlify Forms
      const formData = new FormData();
      formData.append("form-name", "technological-stewardship-survey");
      
      Object.entries(surveyData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, value.join(", "));
        } else {
          formData.append(key, value);
        }
      });

      await fetch("/", {
        method: "POST",
        body: formData,
      });

      // Send email notification
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "techStewardshipSurvey",
          data: surveyData,
        }),
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderLikertScale = (
    question: string,
    field: keyof SurveyData,
    options = likertOptions
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
    field: keyof SurveyData,
    options: { value: string; label: string }[]
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
    field: keyof SurveyData,
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
    field: keyof SurveyData,
    options: { value: string; label: string }[]
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
                &ldquo;The earth is the Lord&apos;s, and everything in it.&rdquo; &mdash; Psalm 24:1
              </p>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
                AI is reshaping how we work, relate, worship and think. This survey asks how Christians are engaging with it &mdash; and what the Church should do next. No technical knowledge required. All answers are anonymous.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {[
                { num: "01", title: "Who Are You?", desc: "Your background, faith tradition, and which AI tools you've used" },
                { num: "02", title: "Your Personal Line", desc: "Where you personally draw the line in your own AI use" },
                { num: "03", title: "The Church's Line", desc: "What AI use is appropriate for the church as a community" },
                { num: "04", title: "How Should We Respond?", desc: "Who leads, what policies we need, and how we respond to society" },
                { num: "05", title: "The Future We Want", desc: "Ranking possible AI futures and your vision for the Church's role" },
              ].map((section) => (
                <div key={section.num} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-blue-400 text-xs font-mono font-bold mb-1">{section.num}</div>
                  <div className="text-white text-sm font-semibold mb-1">{section.title}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{section.desc}</div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-blue-700 hover:bg-blue-600 text-white px-10 py-4 rounded-full font-medium transition-colors text-lg"
              >
                Begin Survey
              </button>
              <p className="text-gray-500 text-sm mt-4">Takes approx. 10 minutes &bull; 5 sections &bull; 25 questions</p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-0.5">Section 01</p>
                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">Who Are You?</h3>
              </div>
            </div>

            {renderSelect("What is your age range?", "ageRange", [
              { value: "18-25", label: "18-25" },
              { value: "26-35", label: "26-35" },
              { value: "36-45", label: "36-45" },
              { value: "46-55", label: "46-55" },
              { value: "56-65", label: "56-65" },
              { value: "65+", label: "65+" },
            ])}

            {renderSelect("Do you identify as a Christian?", "isChristian", [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "exploring", label: "I am exploring Christianity" },
              { value: "other", label: "Prefer not to say" },
            ])}

            {renderSelect("What is your denominational tradition?", "denomination", [
              { value: "catholic", label: "Catholic" },
              { value: "orthodox", label: "Orthodox" },
              { value: "anglican", label: "Anglican/Episcopal" },
              { value: "lutheran", label: "Lutheran" },
              { value: "presbyterian", label: "Presbyterian/Reformed" },
              { value: "methodist", label: "Methodist/Wesleyan" },
              { value: "baptist", label: "Baptist" },
              { value: "pentecostal", label: "Pentecostal/Charismatic" },
              { value: "seventh-day-adventist", label: "Seventh-day Adventist" },
              { value: "nondenominational", label: "Non-denominational" },
              { value: "other", label: "Other" },
            ])}

            {renderSelect("What is your primary role?", "role", [
              { value: "pastor", label: "Pastor/Minister" },
              { value: "priest", label: "Priest" },
              { value: "lay-leader", label: "Lay Leader/Elder" },
              { value: "worship-leader", label: "Worship Leader" },
              { value: "technologist", label: "Technologist/Engineer" },
              { value: "educator", label: "Educator/Academic" },
              { value: "student", label: "Student" },
              { value: "professional", label: "Working Professional" },
              { value: "retired", label: "Retired" },
              { value: "other", label: "Other" },
            ])}

            {renderLikertScale(
              "How comfortable are you with technology generally?",
              "techComfort",
              [
                { value: "1", label: "Very Uncomfortable" },
                { value: "2", label: "Somewhat" },
                { value: "3", label: "Neutral" },
                { value: "4", label: "Comfortable" },
                { value: "5", label: "Very Comfortable" },
                { value: "?", label: "Not Sure" },
              ]
            )}

            {renderCheckboxGroup("Which AI tools have you used? (Select all that apply)", "aiTools", [
              { value: "chatgpt", label: "ChatGPT" },
              { value: "claude", label: "Claude" },
              { value: "gemini", label: "Gemini" },
              { value: "grok", label: "Grok" },
              { value: "copilot", label: "Copilot" },
              { value: "perplexity", label: "Perplexity" },
              { value: "image-ai", label: "Image AI (Midjourney, DALL-E)" },
              { value: "other", label: "Other" },
              { value: "none", label: "None — haven't used AI" },
            ])}
          </div>
        );

      case 2:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-0.5">Section 02</p>
                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">Where Do You Personally Draw the Line?</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">These questions are about your personal use and convictions &mdash; not what everyone should do.</p>

            {renderLikertScale(
              "I use AI in my personal spiritual practices (prayer, Bible study, devotions)",
              "personalSpiritualUse"
            )}

            {renderLikertScale(
              "Overall, AI tools have had a positive impact on my faith",
              "faithImpact"
            )}

            {renderLikertScale(
              "I am concerned about becoming too dependent on AI for thinking and decision-making",
              "decisionDependency"
            )}

            {renderLikertScale(
              "There are uses of AI I personally consider off-limits",
              "personalOffLimits"
            )}

            {renderCheckboxGroup("Which of these do you personally consider off-limits? (Select all that apply)", "offLimitsUses", [
              { value: "spiritual-guidance", label: "Seeking spiritual guidance or prayer" },
              { value: "emotional-support", label: "Emotional support or counselling" },
              { value: "creative-worship", label: "Creating worship music or art" },
              { value: "sermon-prep", label: "Preparing sermons or devotionals" },
              { value: "theological-decisions", label: "Theological decision-making" },
              { value: "none", label: "None — I have no personal off-limits" },
            ])}

            {renderLikertScale(
              "AI has the potential to become something people worship or idolise",
              "idolatryPotential"
            )}
          </div>
        );

      case 3:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-0.5">Section 03</p>
                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">Where Do We As a Church Draw the Line?</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">Should the church use AI in the following areas? Rate each from Definitely Not (1) to Definitely Yes (5).</p>

            {renderLikertScale(
              "The church should use AI to assist with sermon preparation",
              "churchSermonPrep",
              appropriatenessOptions
            )}

            {renderLikertScale(
              "The church should use AI for social media content",
              "churchSocialMedia",
              appropriatenessOptions
            )}

            {renderLikertScale(
              "The church should use AI to help build and maintain its website",
              "churchWebsite",
              appropriatenessOptions
            )}

            {renderLikertScale(
              "The church should use AI for operational efficiency (e.g. computer vision for attendance counting, admin automation)",
              "churchOperations",
              appropriatenessOptions
            )}

            {renderLikertScale(
              "AI-generated content used in church should always be disclosed to the congregation",
              "churchDisclosure"
            )}

            {renderLikertScale(
              "My church currently has a clear position on AI use",
              "churchHasPosition"
            )}
          </div>
        );

      case 4:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-0.5">Section 04</p>
                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">How Should We Respond?</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">Thinking about the Church&apos;s role in society and how Christians should engage with AI at a broader level.</p>

            {renderSelect("Who should lead the Church's response to AI?", "whoShouldLead", [
              { value: "denominations", label: "Denominational leadership bodies" },
              { value: "pastors", label: "Local pastors and church leaders" },
              { value: "technologists", label: "Tech-literate members in the congregation" },
              { value: "collaboration", label: "Collaboration between all of the above" },
              { value: "personal", label: "Personal discernment — no formal guidance needed" },
              { value: "unsure", label: "Not sure" },
            ])}

            {renderLikertScale(
              "The Church should develop a formal AI policy or ethical guideline",
              "formalPolicy"
            )}

            {renderLikertScale(
              "I am concerned about AI causing mass unemployment and economic disruption",
              "unemploymentConcern"
            )}

            {renderLikertScale(
              "Christians should be cautious and speak out against government use of AI for mass surveillance and social control",
              "surveillanceResistance"
            )}
          </div>
        );

      case 5:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-0.5">Section 05</p>
                <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">What Future Do We Want to Create?</h3>
              </div>
            </div>

            {renderLikertScale(
              "AI has significant relevance to how Christians should think about the end times",
              "eschatologicalSignificance"
            )}

            <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 mb-6 mt-4">
              <h4 className="text-white text-sm font-semibold mb-2 uppercase tracking-wider">Context from the culture</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                In <em>Life 3.0</em>, Max Tegmark describes <strong className="text-white">AGI (Artificial General Intelligence)</strong> &mdash; AI that can perform any intellectual task a human can, with the potential to recursively improve itself. He outlines seven possible futures for humanity if AGI emerges.
              </p>
              <p className="text-gray-400 text-xs italic">
                Drag the cards below to rank from most desirable (1) to least desirable (7). Which future are we stewarding toward?
              </p>
            </div>

            <TegmarkRanking
              onRankChange={(ranks) => {
                updateSurveyData("tegmarkRankDictatorship", ranks.dictatorship);
                updateSurveyData("tegmarkRankEnslaved", ranks.enslaved);
                updateSurveyData("tegmarkRankGatekeeper", ranks.gatekeeper);
                updateSurveyData("tegmarkRankZookeeper", ranks.zookeeper);
                updateSurveyData("tegmarkRankLibertarian", ranks.libertarian);
                updateSurveyData("tegmarkRankEgalitarian", ranks.egalitarian);
                updateSurveyData("tegmarkRankProtector", ranks.protector);
              }}
            />

            {renderTextArea(
              "In your own words: what is the most important thing the Church should do in response to AI?",
              "finalVision",
              "Share your perspective...",
              true
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <>
        {/* Hidden Netlify form for build-time detection */}
        <form name="technological-stewardship-survey" data-netlify="true" hidden>
          <input type="text" name="ageRange" />
          <input type="text" name="isChristian" />
          <input type="text" name="denomination" />
          <input type="text" name="role" />
          <input type="text" name="techComfort" />
          <input type="text" name="aiTools" />
          <input type="text" name="personalSpiritualUse" />
          <input type="text" name="faithImpact" />
          <input type="text" name="decisionDependency" />
          <input type="text" name="personalOffLimits" />
          <input type="text" name="offLimitsUses" />
          <input type="text" name="idolatryPotential" />
          <input type="text" name="churchSermonPrep" />
          <input type="text" name="churchSocialMedia" />
          <input type="text" name="churchWebsite" />
          <input type="text" name="churchOperations" />
          <input type="text" name="churchDisclosure" />
          <input type="text" name="churchHasPosition" />
          <input type="text" name="whoShouldLead" />
          <input type="text" name="formalPolicy" />
          <input type="text" name="unemploymentConcern" />
          <input type="text" name="surveillanceResistance" />
          <input type="text" name="eschatologicalSignificance" />
          <input type="text" name="tegmarkRankDictatorship" />
          <input type="text" name="tegmarkRankEnslaved" />
          <input type="text" name="tegmarkRankGatekeeper" />
          <input type="text" name="tegmarkRankZookeeper" />
          <input type="text" name="tegmarkRankLibertarian" />
          <input type="text" name="tegmarkRankEgalitarian" />
          <input type="text" name="tegmarkRankProtector" />
          <textarea name="finalVision"></textarea>
        </form>
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
              setSurveyData(initialSurveyData);
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
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              TECHNOLOGICAL STEWARDSHIP
            </h1>
            <p className="text-gray-300 text-base md:text-xl max-w-2xl mx-auto italic">
              &ldquo;The earth is the Lord&apos;s, and everything in it...&rdquo; — Psalm 24:1
            </p>
          </div>
        </div>
      </section>

      {/* Survey Section */}
      <section className="py-12 md:py-20 px-6">
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
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  disabled={currentStep === 0}
                >
                  <ChevronLeft size={20} />
                  Back
                </button>

                {currentStep < totalSteps - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
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
