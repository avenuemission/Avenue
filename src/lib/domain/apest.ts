// The APEST quiz: roles, questions, scale and scoring, shared by the public
// /apest-quiz page and Calling section 4. Pure: no fetches, no OpenAI.

export const APEST_ROLES = {
  apostle: {
    name: "Apostle",
    description: "Apostles are pioneers and visionaries who start new initiatives and establish foundations for others to build upon.",
    leadershipBenefit: "As an Apostle, you have a natural ability to cast vision and pioneer new directions. Your gift for seeing possibilities and creating systems makes you invaluable in starting and establishing pathway groups. You can help set the foundation and culture that others will build upon.",
  },
  prophet: {
    name: "Prophet",
    description: "Prophets have keen discernment and speak truth, calling communities to alignment with God's purposes.",
    leadershipBenefit: "As a Prophet, your discernment and commitment to truth brings clarity and direction to a group. You can sense underlying issues before they surface and aren't afraid to address them. Your voice helps keep pathway groups aligned with their purpose and values.",
  },
  evangelist: {
    name: "Evangelist",
    description: "Evangelists are passionate communicators who inspire others and spread the message with enthusiasm.",
    leadershipBenefit: "As an Evangelist, your enthusiasm and communication skills are contagious. You naturally draw people in and help them embrace new ideas. Leading a pathway group allows you to share your passion and help others discover their own faith journey.",
  },
  shepherd: {
    name: "Shepherd",
    description: "Shepherds nurture and care for people, creating safe environments where individuals can grow and flourish.",
    leadershipBenefit: "As a Shepherd, you create environments where people feel safe, accepted, and cared for. Your patience and genuine concern for others' wellbeing makes you a natural leader. A pathway group under your care becomes a place of healing and authentic community.",
  },
  teacher: {
    name: "Teacher",
    description: "Teachers love to study, understand, and explain truth in ways that help others learn and grow.",
    leadershipBenefit: "As a Teacher, you have a gift for making complex truths accessible and practical. Your love of learning and ability to break down concepts helps others grow in their understanding. Leading a pathway group allows you to guide others into deeper knowledge and wisdom.",
  },
};

export type RoleKey = keyof typeof APEST_ROLES;

export const APEST_ORDER: RoleKey[] = ["apostle", "prophet", "evangelist", "shepherd", "teacher"];

export const QUESTIONS: { text: string; role: RoleKey }[] = [
  { text: "You often find yourself starting new initiatives or organizations from scratch.", role: "apostle" },
  { text: "When you see injustice or moral compromise, you feel compelled to speak up immediately.", role: "prophet" },
  { text: "You naturally look for opportunities to share your beliefs and convictions with others.", role: "evangelist" },
  { text: "People often seek you out for emotional support and guidance.", role: "shepherd" },
  { text: "You enjoy breaking down complex concepts into understandable parts.", role: "teacher" },
  { text: "You're energized by creating systems and structures that others can build upon.", role: "apostle" },
  { text: "You have a strong sense of what needs to change in organizations or communities.", role: "prophet" },
  { text: "You find it easy to adapt your communication style to connect with different audiences.", role: "evangelist" },
  { text: "You're deeply concerned about the personal growth and wellbeing of others.", role: "shepherd" },
  { text: "You love researching and discovering new insights about familiar topics.", role: "teacher" },
  { text: "You're comfortable challenging traditional ways of doing things to pioneer new approaches.", role: "apostle" },
  { text: "You can often sense underlying problems before they become apparent to others.", role: "prophet" },
  { text: "You're energized by helping others discover and embrace new ideas or beliefs.", role: "evangelist" },
  { text: "You naturally create environments where people feel safe and accepted.", role: "shepherd" },
  { text: "You find fulfillment in helping others develop their understanding and skills.", role: "teacher" },
  { text: "You see opportunities and possibilities where others see obstacles.", role: "apostle" },
  { text: "You feel a strong responsibility to speak truth, even when it's uncomfortable.", role: "prophet" },
  { text: "You're good at persuading others and building enthusiasm for ideas or causes.", role: "evangelist" },
  { text: "You're patient with people's growth process and celebrate small victories.", role: "shepherd" },
  { text: "You have a gift for making complex information accessible and practical.", role: "teacher" },
];

export const SCALE_OPTIONS = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Somewhat" },
  { value: 4, label: "Often" },
  { value: 5, label: "In every way" },
];

export interface ApestResults {
  apostle: number;
  prophet: number;
  evangelist: number;
  shepherd: number;
  teacher: number;
}

// Four questions per role, five points each.
export const MAX_PER_ROLE = 20;

// Percent per role, exactly as the public page has always computed it.
export function scoreApest(answers: readonly number[]): ApestResults {
  if (answers.length !== QUESTIONS.length) {
    throw new Error(`Expected ${QUESTIONS.length} answers, got ${answers.length}`);
  }
  const scores: ApestResults = { apostle: 0, prophet: 0, evangelist: 0, shepherd: 0, teacher: 0 };
  QUESTIONS.forEach((question, index) => {
    scores[question.role] += answers[index];
  });
  const pct = (n: number) => Math.round((n / MAX_PER_ROLE) * 100);
  return {
    apostle: pct(scores.apostle),
    prophet: pct(scores.prophet),
    evangelist: pct(scores.evangelist),
    shepherd: pct(scores.shepherd),
    teacher: pct(scores.teacher),
  };
}

// The public page's rule, unchanged: on a tie the later role wins.
export function topRole(results: ApestResults): RoleKey {
  const entries = Object.entries(results) as [RoleKey, number][];
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}

// Calling's rule: highest two, ties broken in APEST order.
export function topTwoRoles(results: ApestResults): [RoleKey, RoleKey] {
  const ranked = [...APEST_ORDER].sort(
    (a, b) => results[b] - results[a] || APEST_ORDER.indexOf(a) - APEST_ORDER.indexOf(b)
  );
  return [ranked[0], ranked[1]];
}
