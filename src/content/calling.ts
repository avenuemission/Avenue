// Calling (phase 2) content. Every word is Henry's, from "Scripts for
// Podcast on Calling" (C:\Users\User\Downloads). Edit here and mirror the
// change in docs/calling-content.md. Each video section links its video
// in the "Calling videos" YouTube playlist by youtubeId.
import type { CallingSectionId, Layer, Willing } from "@/lib/domain/journey";
import type { RoleKey } from "@/lib/domain/apest";
import type { Space } from "@/lib/domain/people";

export interface CallingSectionContent {
  id: CallingSectionId;
  number: number;
  title: string;
  minutes: number;
  hasVideo: boolean;
  youtubeId: string | null;
  summary: string;
}

export const CALLING_SECTIONS: CallingSectionContent[] = [
  {
    id: "layers",
    number: 1,
    title: "What is a Calling",
    minutes: 6,
    hasVideo: true,
    youtubeId: "tl4_rN6jrh0",
    summary:
      "A career is what you get paid to do, but a calling is what you are made to do. Everyone is created for a calling. Anyone who is a disciple of Jesus has the exact same Shared Call, and it is permanent. Your Specific Call is a fusion of your personality, spiritual gifting and skills, and it is adaptive. Your Seasonal Call is often changing: a particular season, a particular place, or a particular ministry assignment.",
  },
  {
    id: "callable",
    number: 2,
    title: "A Life that is Callable",
    minutes: 8,
    hasVideo: true,
    youtubeId: "hSB0uoiVIqc",
    summary:
      "For so many of us, we haven't created the space to listen to God's voice, or to restructure our life if He does call us. All three levels of calling require us to surrender to Jesus. Being just one degree off the path God has for us can lead us somewhere we never intended to be. God cares far more about who we are becoming than what we are doing, and if God calls us, He will resource us.",
  },
  {
    id: "shared",
    number: 3,
    title: "The Shared Call",
    minutes: 6,
    hasVideo: true,
    youtubeId: "-T3iIBc8zZQ",
    summary:
      "The Great Commission is the mission statement God gave to the church, and it is our permanent calling. Before Jesus ever sends us out, He first calls us to be with Him (Mark 3:14). The word \"go\" is in the participle, so we can read it this way: as you go, make disciples. All of us have the call of inviting people into our life, the good, the bad and the ugly. We say yes to Jesus first, and then we are made ready as we follow Him.",
  },
  {
    id: "apest",
    number: 4,
    title: "The Specific Call",
    minutes: 8,
    hasVideo: true,
    youtubeId: "OtRoQqBH724",
    summary:
      "Scripture gives us three primary gift passages: 1 Corinthians 12 covers Manifestation Gifts, Romans 12 covers Skill Gifts, and Ephesians 4 covers Calling Gifts: Apostles, Prophets, Evangelists, Shepherds and Teachers. In Ephesians 4, the gifts aren't just things people do; they are who people are. God gives these gifts not for leaders to do all the work themselves, but to be multipliers who equip everyone else. When every person functions in their gifting, the church moves toward unity and the fullness of Christ.",
  },
  {
    id: "seasonal",
    number: 5,
    title: "The Seasonal Call",
    minutes: 10,
    hasVideo: true,
    youtubeId: "9GZrWGO8e4c",
    summary:
      "Seasonal calling is where your Shared Call and your Specific Call meet the actual terrain of your daily life. Your 1st space is your home, your 2nd space is your work, and your 3rd space is play. Knowing where God has already placed you across all three helps you figure out who you're called to reach. Your daily context across all three spaces is already your mission field. God has already given you His general instructions, so don't let fear paralyze you.",
  },
  {
    id: "conversation",
    number: 6,
    title: "Conversation",
    minutes: 3,
    hasVideo: false,
    youtubeId: null,
    summary: "",
  },
];

export interface LayerStatement {
  id: string;
  text: string;
  layer: Layer;
  reason: string;
}

export const LAYER_STATEMENTS: LayerStatement[] = [
  {
    id: "s1",
    text: "Go and make disciples of all nations.",
    layer: "shared",
    reason: "This is the Great Commission, the Shared Call every disciple of Jesus has. It never changes, regardless of your stage of life or job title.",
  },
  {
    id: "s2",
    text: "Paul discerning whether God is leading him to Rome or to a new region.",
    layer: "seasonal",
    reason: "Paul leaned into God to discern where He might be calling him next. His seasonal assignments shifted, but his identity remained firm.",
  },
  {
    id: "s3",
    text: "Your personality, spiritual gifting and skills, fused together.",
    layer: "specific",
    reason: "The Specific Call is a fusion of our personality, spiritual gifting and skills.",
  },
  {
    id: "s4",
    text: "Being an ambassador for Christ, carrying the ministry of reconciliation.",
    layer: "shared",
    reason: "In 2 Corinthians 5 Paul writes that God has given all of us the ministry of reconciliation. Before any specific assignment, Paul grounded his life in this shared, universal mission.",
  },
  {
    id: "s5",
    text: "Applying for a new job or changing careers.",
    layer: "seasonal",
    reason: "God calls us for a particular season. We might be called to change careers or apply for a new job. That is the Seasonal Call, and it is often changing.",
  },
  {
    id: "s6",
    text: "Paul commissioned as an apostle to the Gentiles.",
    layer: "specific",
    reason: "Within that shared call, Paul was uniquely commissioned by God and used the specific gifts God placed in him.",
  },
  {
    id: "s7",
    text: "Inviting people into your life, the good, the bad and the ugly, as you follow Jesus.",
    layer: "shared",
    reason: "Whatever your Specific Call or Seasonal Call, all of us have the call of inviting people into our life. That is part of the Shared Call.",
  },
  {
    id: "s8",
    text: "Growing more aware of your strengths and learning to manage your weaknesses as you walk with Jesus.",
    layer: "specific",
    reason: "Your specific call is adaptive: as you walk with Jesus, you refine your giftings and learn to manage your weaknesses so God can use your unique wiring.",
  },
  {
    id: "s9",
    text: "Taking on a new ministry position.",
    layer: "seasonal",
    reason: "A particular ministry assignment for a particular season is the Seasonal Call.",
  },
];

export const LAYER_KEY: Record<string, Layer> = Object.fromEntries(LAYER_STATEMENTS.map((s) => [s.id, s.layer]));

export const LAYER_LABELS: Record<Layer, { name: string; kind: string; line: string }> = {
  shared: {
    name: "Shared",
    kind: "Permanent",
    line: "The Great Commission. It never changes, regardless of your stage of life or job title.",
  },
  specific: {
    name: "Specific",
    kind: "Adaptive",
    line: "A fusion of your personality, spiritual gifting and skills.",
  },
  seasonal: {
    name: "Seasonal",
    kind: "Changing",
    line: "A particular season, a particular place, or a particular ministry assignment.",
  },
};

export const JOURNAL_PROMPTS: { key: "crowding" | "shadow" | "fear" | "ifCalled"; label: string }[] = [
  {
    key: "crowding",
    label: "What is crowding out the space to listen to God's voice, or to restructure your life if He does call you?",
  },
  {
    key: "shadow",
    label: "Where might your gifts be serving a \"shadow mission\", even one degree off the path God has for you? Is it ego, pride or fear?",
  },
  {
    key: "fear",
    label: "What do you fear about being called: what others might think, the changes you would need to make, or the time it might take?",
  },
  {
    key: "ifCalled",
    label: "If God called you this season, what would have to change?",
  },
];

export const WILLING_QUESTION = "Are you willing and available to be called by God?";

export const WILLING_OPTIONS: { value: Willing; label: string; response: string }[] = [
  {
    value: "yes",
    label: "Yes",
    response: "Then create space for Him in your life, so that He can infuse Himself into everything you do.",
  },
  {
    value: "notYet",
    label: "Not yet",
    response: "God saw Moses' fears, and He gave Moses everything he needed. If God calls you, He will resource you.",
  },
  {
    value: "unsure",
    label: "Unsure",
    response: "God cares far more about who you are becoming than what you are doing. Calling is about the character being formed in you.",
  },
];

export const SHARED_SCENARIO = {
  prompt: "A friend tells you life has been really hard lately. What do you do?",
  choices: [
    {
      value: "event" as const,
      label: "Invite them to our next event",
      feedback:
        "An event can be a good thing. But \"it's a lot easier to invite people to a program or an event, but a lot harder to invite them to come walk with you as you follow Jesus.\" The Shared Call is inviting people into your life, not keeping them at arm's length.",
    },
    {
      value: "dinner" as const,
      label: "Invite them to dinner with us this week",
      feedback:
        "That's the Shared Call. You don't keep people at arm's length, but invite them into the way you follow Jesus: the good, the bad and the ugly.",
    },
  ],
  yesQuestion: "Will you say yes to the Shared Call?",
  yesNote: "No one is ready to be a disciple of Jesus. We say yes to Jesus first, and then we are made ready as we follow Him.",
};

export const APEST_CALLING_TEXT: Record<RoleKey, { name: string; calling: string; equips: string; seesChurch: string; immature: string }> = {
  apostle: {
    name: "Apostle",
    calling:
      "The word means \"sent ones.\" Apostles are pioneers who move outward to extend the church's impact as a missionary movement. They love risk, innovation, and taking the gospel to unreached spaces.",
    equips: "Apostles equip us to be missionaries.",
    seesChurch: "The Apostle sees the church as a place of experimentation and pioneering.",
    immature: "An immature apostle can run over people and leave them hanging because they just want to move fast.",
  },
  prophet: {
    name: "Prophet",
    calling:
      "This calling is about calling people back to covenant faithfulness with God. Prophets bring a voice of correction, pointing people to a holy relationship with God while advocating for justice.",
    equips: "Prophets equip us to bring a holy presence.",
    seesChurch: "The Prophet sees the church as a place to learn to live righteously.",
    immature: "An immature prophet can self-righteously become overly critical, hyper-focusing only on what they dislike.",
  },
  evangelist: {
    name: "Evangelist",
    calling:
      "Evangelists infectiously share the good news with people who don't know Jesus yet. They aren't necessarily pulpit preachers; more often, they are charismatic relationship-builders who naturally connect with people outside the church.",
    equips: "Evangelists equip us to share the news.",
    seesChurch: "The Evangelist sees the church as a place full of soul and life.",
    immature:
      "An immature evangelist can be so enthusiastic that they avoid conflict, draw people to themselves instead of the gospel, or make unwise decisions just to be liked.",
  },
  shepherd: {
    name: "Shepherd",
    calling:
      "Shepherds ensure people are deeply connected to community, known, and loved. They make people feel incredibly warm and cared for.",
    equips: "Shepherds equip us to care deeply.",
    seesChurch: "The Shepherd sees the church as a spiritual hospital for healing.",
    immature: "An immature shepherd can become overly protective or sensitive to feelings, driven by a fear of offending people.",
  },
  teacher: {
    name: "Teacher",
    calling:
      "Teachers formulate clear pathways of learning so biblical truths are passed on. They take deep theological concepts and make them simple, cultivating a love for Scripture.",
    equips: "Teachers equip us to apply truth.",
    seesChurch: "The Teacher sees the church as a spiritual university for learning.",
    immature:
      "An immature teacher can become obsessed with accuracy and proving they're right, valuing their relationship with information over their relationship with people, speaking with a hard edge.",
  },
};

export const SPACE_CONTENT: Record<Space, { name: string; short: string; line: string; pro: string }> = {
  first: {
    name: "1st space",
    short: "Home",
    line: "Your home isn't just a place to retreat and hide from the world; it's a place of radical hospitality where you can host, build trust, and invite people into your life.",
    pro: "A 1st space group at home offers intimacy.",
  },
  second: {
    name: "2nd space",
    short: "Work",
    line: "The Hebrew word Avodah is used for work, worship and service. Your regular daily work isn't secondary to ministry; work is worship.",
    pro: "A 2nd space group at work offers convenient reach.",
  },
  third: {
    name: "3rd space",
    short: "Play",
    line: "The places you hang out, pursue hobbies, gather at local cafes, or connect in the community. Often the easiest place to build organic, unforced relationships with people who don't know Jesus yet.",
    pro: "A 3rd space group in a neutral environment offers low-barrier comfort for newcomers.",
  },
};

export const SEASONAL_QUESTIONS = {
  peopleGroup: "What people group do you have a heart for, based on the faces in your 3 spaces?",
  hosting: "If God is calling you to plant a Pathway Group in this season, which of these spaces makes the most sense to host it in?",
  hostingNote: "Each space has its pros and cons, and we'll unpack those in detail in the next phase.",
  riceIntro: "If you are trying to discern what's next in your season, a helpful tool to lean into is the RICE framework.",
  riceDecision: "One decision you are weighing this season",
};

export const RICE_FIELDS: { key: "reason" | "intuition" | "counsel" | "experience"; letter: string; label: string; prompt: string }[] = [
  { key: "reason", letter: "R", label: "Reason from Scripture", prompt: "What does the clear truth of God's Word say?" },
  { key: "intuition", letter: "I", label: "Intuition from within", prompt: "What is the Holy Spirit stirring in your heart?" },
  { key: "counsel", letter: "C", label: "Counsel from others", prompt: "What are trusted spiritual leaders and peers speaking into your life?" },
  { key: "experience", letter: "E", label: "Experience from the past", prompt: "What has God taught you through your previous seasons?" },
];

export const CONVERSATION_CONTENT = {
  title: "Book your theology and character conversation with a pastor",
  body: "Conversations with board or pastors about core theology and character.",
  checkbox: "I've booked my conversation",
  dateLabel: "When is it? (optional)",
};
