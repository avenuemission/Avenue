// The /faq page, and the FAQPage JSON-LD on it. Only facts already on the
// site or in AVENUE_FACTS: no numbers, nothing unconfirmed. Answers are
// plain text so search engines and AI assistants can quote them as written.
import { AVENUE_FACTS } from "./site";
import { PRAYER_AND_PRAISE_WHEN, VENUE_LINE } from "@/lib/domain/siteFacts";

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "What is Avenue Mission?",
    answer:
      "Avenue Mission is a decentralised movement of people following Jesus in Melbourne, Victoria. We are convinced that disciple-making doesn't require more church buildings, just the willingness to open the spaces we already have.",
  },
  {
    question: "Is Avenue connected to the Seventh-day Adventist Church?",
    answer: "Yes. Avenue is a church supported by the Seventh-day Adventist Church.",
  },
  {
    question: "What is a Pathway?",
    answer:
      "A pathway is a house church. A few people meet in a home, a library or a school, wherever God has placed them.",
  },
  {
    question: "What happens at a Pathway?",
    answer:
      "We eat together, read the Bible together, pray and look out for one another. When a pathway grows, it sends people out to light up the next home.",
  },
  {
    question: "How do I join a Pathway?",
    answer:
      "Fill out the Join a Pathway Group form on the Pathways page and we will connect you with a pathway group near you.",
  },
  {
    question: "Can I start or lead a Pathway?",
    answer:
      "Yes. Becoming a pathway leader is where it begins. We train you, walk with you, and give you everything you need to gather people and grow them. Choose Become a Pathway Leader on the Pathways page.",
  },
  {
    question: "Where and when is Prayer & Praise?",
    answer: `${PRAYER_AND_PRAISE_WHEN}, at ${VENUE_LINE}.`,
  },
  {
    question: "What is Intersection?",
    answer:
      "Intersection is where pathways meet as one family: weekly Prayer and Praise, combined pathway nights, quarterly sermons, Avenue camps and plenty of fun in between.",
  },
  {
    question: "What are Streetlights?",
    answer:
      "Streetlights are how each pathway shines in its neighbourhood: homeless outreach, songwriting, podcasts, mission trips, and partnerships with local churches and organisations.",
  },
  {
    question: "How do I get in touch?",
    answer: `Email ${AVENUE_FACTS.email}. You can also find Avenue Mission on Instagram, Facebook, YouTube and LinkedIn.`,
  },
];
