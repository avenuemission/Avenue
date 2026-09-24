// The Technological Stewardship survey, defined once. The public form
// (/technological-stewardship) asks these questions in this order, and the
// workshop results page (/leaders/workshops/[code]) charts them from the
// survey_responses columns named here. Pure data.

export interface SurveyOption {
  value: string;
  label: string;
}

// The answers the form sends to /api/workshops/submit, keyed by field.
export interface SurveyAnswers {
  ageRange: string;
  isChristian: string;
  denomination: string;
  role: string;
  techComfort: string;
  aiTools: string[];
  personalSpiritualUse: string;
  faithImpact: string;
  decisionDependency: string;
  personalOffLimits: string;
  offLimitsUses: string[];
  idolatryPotential: string;
  neighbourPrinciple: string;
  churchSermonPrep: string;
  churchSocialMedia: string;
  churchWebsite: string;
  churchOperations: string;
  churchDisclosure: string;
  churchHasPosition: string;
  whoShouldLead: string[];
  formalPolicy: string;
  unemploymentConcern: string;
  surveillanceResistance: string;
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

export type SurveyField = keyof SurveyAnswers;
type TextField = { [K in SurveyField]: SurveyAnswers[K] extends string ? K : never }[SurveyField];
type ListField = { [K in SurveyField]: SurveyAnswers[K] extends string[] ? K : never }[SurveyField];

interface Asked {
  /** The survey_responses column the answer is stored in. */
  column: string;
  /** As the form asks it. */
  question: string;
  /** A shorter heading on the results page, where it differs. */
  resultsTitle?: string;
}

export type SurveyQuestion =
  | (Asked & { kind: "select"; field: TextField; options: SurveyOption[]; privateLabel?: string })
  | (Asked & { kind: "scale"; field: TextField; options: SurveyOption[] })
  | (Asked & { kind: "multi"; field: ListField; options: SurveyOption[] })
  | (Asked & { kind: "text"; field: TextField; placeholder: string; required: boolean })
  | { kind: "ranking" };

export interface SurveySection {
  id: string;
  num: string;
  /** The section heading on the form and the results page. */
  title: string;
  /** The intro card on the form's first step. */
  cardTitle: string;
  cardDescription: string;
  /** The results page's section nav. */
  navTitle: string;
  intro?: string;
  questions: SurveyQuestion[];
}

// 1 to 5 plus "?" (not sure).
export const AGREE_SCALE: SurveyOption[] = [
  { value: "1", label: "Strongly Disagree" },
  { value: "2", label: "Disagree" },
  { value: "3", label: "Neutral" },
  { value: "4", label: "Agree" },
  { value: "5", label: "Strongly Agree" },
  { value: "?", label: "Not Sure" },
];

const APPROPRIATE_SCALE: SurveyOption[] = [
  { value: "1", label: "Definitely Not" },
  { value: "2", label: "Probably Not" },
  { value: "3", label: "Maybe" },
  { value: "4", label: "Probably Yes" },
  { value: "5", label: "Definitely Yes" },
  { value: "?", label: "Not Sure" },
];

const COMFORT_SCALE: SurveyOption[] = [
  { value: "1", label: "Very Uncomfortable" },
  { value: "2", label: "Somewhat" },
  { value: "3", label: "Neutral" },
  { value: "4", label: "Comfortable" },
  { value: "5", label: "Very Comfortable" },
  { value: "?", label: "Not Sure" },
];

// Max Tegmark's seven AGI futures (Life 3.0), ranked 1 (most desirable) to 7.
export const TEGMARK_OUTCOMES: { id: string; label: string; desc: string; field: TextField; column: string }[] = [
  { id: "dictatorship", label: "AI Dictatorship", desc: "Concentrated power where AI serves a totalitarian regime controlling all aspects of life.", field: "tegmarkRankDictatorship", column: "tegmark_rank_dictatorship" },
  { id: "enslaved", label: "Enslaved AGI", desc: "Superintelligent AI exists but is controlled by a small elite who monopolize its benefits.", field: "tegmarkRankEnslaved", column: "tegmark_rank_enslaved" },
  { id: "gatekeeper", label: "Gatekeeper", desc: "Strict global regulation prevents AGI development, maintaining status quo but limiting progress.", field: "tegmarkRankGatekeeper", column: "tegmark_rank_gatekeeper" },
  { id: "zookeeper", label: "Zookeeper", desc: "AI manages humanity much like we manage animals in zoos\u2014kept comfortable but controlled.", field: "tegmarkRankZookeeper", column: "tegmark_rank_zookeeper" },
  { id: "libertarian", label: "Libertarian Utopia", desc: "Free market AI where individuals and corporations compete, creating wealth but also inequality.", field: "tegmarkRankLibertarian", column: "tegmark_rank_libertarian" },
  { id: "egalitarian", label: "Egalitarian Utopia", desc: "AI benefits are shared equally across humanity, eliminating poverty and class divides.", field: "tegmarkRankEgalitarian", column: "tegmark_rank_egalitarian" },
  { id: "protector", label: "Protector AGI", desc: "Benevolent AI acts as a guardian, guiding humanity toward flourishing while respecting freedom.", field: "tegmarkRankProtector", column: "tegmark_rank_protector" },
];

export const SURVEY_SECTIONS: SurveySection[] = [
  {
    id: "s01",
    num: "01",
    title: "Who Are You?",
    cardTitle: "Who Are You?",
    cardDescription: "Your background, faith tradition, and which AI tools you've used",
    navTitle: "Who Are You?",
    questions: [
      {
        kind: "select",
        field: "ageRange",
        column: "age_range",
        question: "What is your age range?",
        resultsTitle: "Age Range",
        privateLabel: "Age Range",
        options: ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"].map((v) => ({ value: v, label: v })),
      },
      {
        kind: "select",
        field: "isChristian",
        column: "is_christian",
        question: "Do you identify as a Christian?",
        privateLabel: "Christian?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "exploring", label: "I am exploring Christianity" },
          { value: "other", label: "Prefer not to say" },
        ],
      },
      {
        kind: "select",
        field: "denomination",
        column: "denomination",
        question: "What is your denominational tradition?",
        resultsTitle: "Denominational Tradition",
        privateLabel: "Denomination",
        options: [
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
        ],
      },
      {
        kind: "select",
        field: "role",
        column: "role",
        question: "What is your primary role?",
        resultsTitle: "Role",
        options: [
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
        ],
      },
      {
        kind: "scale",
        field: "techComfort",
        column: "tech_comfort",
        question: "How comfortable are you with technology generally?",
        options: COMFORT_SCALE,
      },
      {
        kind: "multi",
        field: "aiTools",
        column: "ai_tools",
        question: "Which AI tools have you used? (Select all that apply)",
        resultsTitle: "AI Tools Used",
        options: [
          { value: "chatgpt", label: "ChatGPT" },
          { value: "claude", label: "Claude" },
          { value: "gemini", label: "Gemini" },
          { value: "grok", label: "Grok" },
          { value: "copilot", label: "Copilot" },
          { value: "perplexity", label: "Perplexity" },
          { value: "image-ai", label: "Image AI (Midjourney, DALL-E)" },
          { value: "other", label: "Other" },
          { value: "none", label: "None \u2014 haven't used AI" },
        ],
      },
    ],
  },
  {
    id: "s02",
    num: "02",
    title: "Where Do You Personally Draw the Line?",
    cardTitle: "Your Personal Line",
    cardDescription: "Where you personally draw the line in your own AI use",
    navTitle: "Your Personal Line",
    intro: "These questions are about your personal use and convictions \u2014 not what everyone should do.",
    questions: [
      { kind: "scale", field: "personalSpiritualUse", column: "personal_spiritual_use", question: "I use AI in my personal spiritual practices (prayer, Bible study, devotions)", options: AGREE_SCALE },
      { kind: "scale", field: "faithImpact", column: "faith_impact", question: "Overall, AI tools have had a positive impact on my faith", options: AGREE_SCALE },
      { kind: "scale", field: "decisionDependency", column: "decision_dependency", question: "I am concerned about becoming too dependent on AI for thinking and decision-making", options: AGREE_SCALE },
      { kind: "scale", field: "personalOffLimits", column: "personal_off_limits", question: "There are uses of AI I personally consider off-limits", options: AGREE_SCALE },
      {
        kind: "multi",
        field: "offLimitsUses",
        column: "off_limits_uses",
        question: "Which of these do you personally consider off-limits? (Select all that apply)",
        resultsTitle: "Which uses are personally off-limits?",
        options: [
          { value: "spiritual-guidance", label: "Seeking spiritual guidance or prayer" },
          { value: "emotional-support", label: "Emotional support or counselling" },
          { value: "creative-worship", label: "Creating worship music or art" },
          { value: "sermon-prep", label: "Preparing sermons or devotionals" },
          { value: "theological-decisions", label: "Theological decision-making" },
          { value: "none", label: "None \u2014 I have no personal off-limits" },
        ],
      },
      { kind: "scale", field: "idolatryPotential", column: "idolatry_potential", question: "AI has the potential to become something people worship or idolise", options: AGREE_SCALE },
      {
        kind: "scale",
        field: "neighbourPrinciple",
        column: "neighbour_principle",
        question: "Does the principle Jesus taught \u2014 to love your neighbour as yourself \u2014 currently apply, or will it ever apply, to how we treat AI?",
        options: APPROPRIATE_SCALE,
      },
    ],
  },
  {
    id: "s03",
    num: "03",
    title: "Where Do We As a Church Draw the Line?",
    cardTitle: "The Church's Line",
    cardDescription: "What AI use is appropriate for the church as a community",
    navTitle: "The Church's Line",
    intro: "Should the church use AI in the following areas? Rate each from Definitely Not (1) to Definitely Yes (5).",
    questions: [
      { kind: "scale", field: "churchSermonPrep", column: "church_sermon_prep", question: "The church should use AI to assist with sermon preparation", options: APPROPRIATE_SCALE },
      { kind: "scale", field: "churchSocialMedia", column: "church_social_media", question: "The church should use AI for social media content", options: APPROPRIATE_SCALE },
      { kind: "scale", field: "churchWebsite", column: "church_website", question: "The church should use AI to help build and maintain its website", options: APPROPRIATE_SCALE },
      {
        kind: "scale",
        field: "churchOperations",
        column: "church_operations",
        question: "The church should use AI for operational efficiency (e.g. computer vision for attendance counting, admin automation)",
        resultsTitle: "The church should use AI for operational efficiency (e.g. attendance counting)",
        options: APPROPRIATE_SCALE,
      },
      { kind: "scale", field: "churchDisclosure", column: "church_disclosure", question: "AI-generated content used in church should always be disclosed to the congregation", options: AGREE_SCALE },
      { kind: "scale", field: "churchHasPosition", column: "church_has_position", question: "My church currently has a clear position on AI use", options: AGREE_SCALE },
    ],
  },
  {
    id: "s04",
    num: "04",
    title: "How Should We Respond?",
    cardTitle: "How Should We Respond?",
    cardDescription: "Who leads, what policies we need, and how we respond to society",
    navTitle: "How Should We Respond?",
    intro: "Thinking about the Church's role in society and how Christians should engage with AI at a broader level.",
    questions: [
      {
        kind: "multi",
        field: "whoShouldLead",
        column: "who_should_lead",
        question: "Who should lead the Church's response to AI? (Select all that apply)",
        resultsTitle: "Who should lead the Church's response to AI?",
        options: [
          { value: "denominations", label: "Denominational leadership bodies" },
          { value: "pastors", label: "Local pastors and church leaders" },
          { value: "technologists", label: "Tech-literate members in the congregation" },
          { value: "collaboration", label: "Collaboration between all of the above" },
          { value: "personal", label: "Personal discernment \u2014 no formal guidance needed" },
          { value: "unsure", label: "Not sure" },
        ],
      },
      { kind: "scale", field: "formalPolicy", column: "formal_policy", question: "The Church should develop a formal AI policy or ethical guideline", options: AGREE_SCALE },
      { kind: "scale", field: "unemploymentConcern", column: "unemployment_concern", question: "I am concerned about AI causing mass unemployment and economic disruption", options: AGREE_SCALE },
      {
        kind: "scale",
        field: "surveillanceResistance",
        column: "surveillance_resistance",
        question: "Christians should be cautious and speak out against government use of AI for mass surveillance and social control",
        resultsTitle: "Christians should be cautious and speak out against government use of AI for mass surveillance",
        options: AGREE_SCALE,
      },
    ],
  },
  {
    id: "s05",
    num: "05",
    title: "What Future Do We Want to Create?",
    cardTitle: "The Future We Want",
    cardDescription: "Ranking possible AI futures and your vision for the Church's role",
    navTitle: "What Future?",
    questions: [
      { kind: "scale", field: "eschatologicalSignificance", column: "eschatological_significance", question: "AI has significant relevance to how Christians should think about the end times", options: AGREE_SCALE },
      { kind: "ranking" },
      {
        kind: "text",
        field: "finalVision",
        column: "final_vision",
        question: "In your own words: what is the most important thing the Church should do in response to AI?",
        placeholder: "Share your perspective...",
        required: true,
      },
    ],
  },
];

// A blank response: every list empty, every other answer "".
export function blankAnswers(): SurveyAnswers {
  const answers: Record<string, string | string[]> = {};
  for (const section of SURVEY_SECTIONS) {
    for (const q of section.questions) {
      if (q.kind === "ranking") for (const o of TEGMARK_OUTCOMES) answers[o.field] = "";
      else answers[q.field] = q.kind === "multi" ? [] : "";
    }
  }
  return answers as unknown as SurveyAnswers;
}

// Every survey_responses column an answer is stored in, with its field.
export function answerColumns(): { field: SurveyField; column: string }[] {
  return SURVEY_SECTIONS.flatMap((s) =>
    s.questions.flatMap((q) =>
      q.kind === "ranking" ? TEGMARK_OUTCOMES.map((o) => ({ field: o.field, column: o.column })) : [{ field: q.field, column: q.column }]
    )
  );
}

// The results page's label for a scale answer: "1 – Strongly Disagree",
// or "Not Sure" for "?".
export function scaleResultLabel(option: SurveyOption): string {
  return option.value === "?" ? option.label : `${option.value} \u2013 ${option.label}`;
}
