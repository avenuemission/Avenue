// The Avenue Mission Guide: the lists and tables behind
// /leaders/training/mission-guide. The page holds the running prose; this
// file holds every repeated item, so a wording change is one line here.

export interface GuideChapter {
  id: string;
  label: string;
}

export const GUIDE_CHAPTERS: GuideChapter[] = [
  { id: "preamble", label: "Preamble" },
  { id: "dna", label: "DNA" },
  { id: "metrics", label: "Metrics" },
  { id: "intersection", label: "Intersection" },
  { id: "pathways", label: "Pathways" },
  { id: "streetlights", label: "Streetlights" },
  { id: "leadership", label: "Leadership" },
  { id: "board", label: "Board" },
];

export const MISSION_EXAMPLES = [
  "Someone far from God has their potential unleashed by becoming a disciple of Jesus.",
  "Someone walking with Jesus in community has their potential unleashed by being apprenticed to lead, and eventually starting a new group.",
  "Avenue as a whole has its potential unleashed when individuals do.",
];

export const VALUES: { name: string; rest: string; meaning: string }[] = [
  { name: "The Gospel", rest: "is our cause", meaning: "The Bible is the story of God moving to be with humanity." },
  { name: "The Spirit", rest: "is our guide", meaning: "We partner with what the Spirit is already doing in our world." },
  { name: "Worship", rest: "is our response", meaning: "We give our whole life to loving God and loving others." },
  { name: "Multiplication", rest: "is our mission", meaning: "We multiply into many by investing in one." },
  { name: "Inclusivity", rest: "is our culture", meaning: "We're intentional about building bridges with people." },
];

export const PERSONAS: { name: string; text: string }[] = [
  {
    name: "Aaron",
    text: "20 and single, is in second-year uni studying science. He's still financially dependent on his parents and unsure what he wants career-wise. He's introverted, prioritises fitness, likes contemporary music, has a few surface-level friends and is looking for community and belonging.",
  },
  {
    name: "Amy",
    text: "17, is in Year 12 at a local private school with parents pushing her to do well. She's smart, creative, plays piano and sings, and prefers casual over formal. She has a group of five friends but isn't sure they'll last after graduation.",
  },
];

export type Expression = "intersection" | "pathways" | "streetlights";

export const DNA: { id: Expression; name: string; direction: string; text: string; where: string }[] = [
  {
    id: "intersection",
    name: "Intersection",
    direction: "Upward · with God",
    text: "We gather to worship in response to what God has done, offering our lives more fully to him.",
    where: "Wednesday night Prayer and Praise, plus occasional larger worship nights",
  },
  {
    id: "pathways",
    name: "Pathways",
    direction: "Inward · with each other",
    text: "We grow with Jesus by walking with him and others in Pathway groups. The primary place people live and grow at Avenue.",
    where: "Homes, cafés, restaurants and public spaces across Melbourne",
  },
  {
    id: "streetlights",
    name: "Streetlights",
    direction: "Outward · with the world",
    text: "We respond to what Jesus has done through word and deed, as the light of the world.",
    where: "Pathway-led mission, everyday personal witness, and network-wide initiatives like mission trips",
  },
];

export const WINS: { name: string; verb: string; text: string }[] = [
  {
    name: "Pathways",
    verb: "Belong",
    text: "A new person feels like they belong in a Pathway and is comfortable inviting someone else into the community.",
  },
  {
    name: "Intersection",
    verb: "Commit",
    text: "A person is baptised or makes a decision of faith and is then apprenticed to lead in a Pathway.",
  },
  {
    name: "Streetlights",
    verb: "Step out",
    text: "A disciple responds to the Holy Spirit by stepping out to plant, lead or serve in a new Pathways or Streetlights initiative.",
  },
];

export const PRAYER_AND_PRAISE: { name: string; text: string }[] = [
  {
    name: "Worship through music",
    text: "led by people who prioritise God's presence over performance, in a way that invites both the seeker and the seasoned believer to respond.",
  },
  { name: "The Word", text: "a short, Scripture-rooted reflection that both challenges and invites." },
  { name: "Prayer", text: "real space to pray for each other, our Pathways, our friends who don't know Jesus, and our city." },
  { name: "Stories", text: "what God is doing across the network, especially the wins in our Metrics of Success." },
  {
    name: "A next step",
    text: "every night points somewhere, whether that's joining a Pathway, exploring faith, getting baptised, being apprenticed or serving.",
  },
];

export const BIG_MOMENTS: { name: string; text: string }[] = [
  { name: "Before", text: "clear, creative communication and personal invites, so people know what to expect and bring friends." },
  { name: "During", text: "hospitality from the moment people arrive, and a clear call to a next step." },
  {
    name: "After",
    text: "connect cards followed up personally and promptly, with leaders helping people into a Pathway, baptism or serving.",
  },
];

export const PATHWAY_RHYTHMS: { name: string; text: string }[] = [
  {
    name: "Worship and Scripture",
    text: "we gather around the Bible not just to learn but to be formed. Conversations centre on Jesus, grounded in grace, helping each person hear what God is saying in their life.",
  },
  {
    name: "Prayer and care",
    text: "we share what's real, our hopes, fears, questions and struggles. We pray for each other in and outside gatherings and show up practically when someone's in need.",
  },
  {
    name: "Food and friendship",
    text: "we eat together. Lunch, brunch or dinner, a shared meal builds trust and makes room for deeper friendship.",
  },
  {
    name: "Mission together",
    text: "every Pathway serves beyond itself, by meeting needs, inviting friends in, or partnering with Streetlights initiatives.",
  },
];

export const APEST: { name: string; text: string }[] = [
  { name: "Apostles", text: "Pioneer, innovate and expand the mission." },
  { name: "Prophets", text: "Listen to God and call the community back to faithfulness." },
  { name: "Evangelists", text: "Share the good news and draw others into the story." },
  { name: "Shepherds", text: "Care for people, cultivate healing and build healthy relationships." },
  { name: "Teachers", text: "Help others understand and live out Scripture." },
];

export const APPRENTICE_STEPS = [
  "I do. You watch. We talk.",
  "I do. You help. We talk.",
  "You do. I help. We talk.",
  "You do. I watch. We talk.",
  "You do. Someone else watches.",
];

export const MISSION_PLACES: { name: string; text: string }[] = [
  {
    name: "Personally",
    text: "every disciple living on mission in their everyday spaces: uni, school, work, the gym, the group chat, the neighbourhood.",
  },
  {
    name: "In Pathways",
    text: "every Pathway owns its own mission, finding ways to serve and reach the people around it. This is where most Streetlights should live.",
  },
  {
    name: "Across the network",
    text: "bigger initiatives no single Pathway could run alone, like our mission trip to the Philippines.",
  },
];

export const BLESS: { letter: string; word: string }[] = [
  { letter: "B", word: "Begin with prayer" },
  { letter: "L", word: "Listen" },
  { letter: "E", word: "Eat" },
  { letter: "S", word: "Serve" },
  { letter: "S", word: "Story" },
];

export const MISSION_WORD = [
  "Sharing your story with a friend or co-worker",
  "Inviting someone to your Pathway",
  "Walking someone through the gospel one-on-one",
  "Running an Alpha course, a conversation night or a mental health night",
];

export const MISSION_DEED = [
  "Serving at a shelter, food bank or community program",
  "Helping someone move house or bringing meals to a family doing it tough",
  "Red Frogs: a calm, non-judgemental presence for young people in party spaces",
  "Partnering with schools, local justice initiatives and community organisations",
  "A Centre of Influence or hub where faith meets culture, like creative and music nights in a local business",
  "Mission trips that combine practical aid with long-term discipleship",
  "Anything else that reaches people who would never walk into a church building",
];

export const MISSION_QUESTIONS = [
  "Where is God already at work around me?",
  "Who is God calling me to bless, serve or invite?",
  "How can I be part of what God is doing locally or globally?",
];

export const LEADERSHIP_VALUES: { name: string; text: string }[] = [
  { name: "Humility and teachability", text: "we stay open to learning, correction and growth, knowing we need God's guidance." },
  {
    name: "Love and respect",
    text: "we act out of love and show respect in our words and actions, valuing honesty and trustworthiness.",
  },
  { name: "Passion and enthusiasm", text: "we lead with energy, driven by our commitment to Jesus and his mission." },
  {
    name: "Grace and generosity",
    text: "we extend grace in every situation and lead with an open hand, generous with our time, resources and care.",
  },
  {
    name: "Dependability and integrity",
    text: "we follow through on our commitments and keep our integrity in private and in public.",
  },
];

export const UP_IN_OUT: { heading: string; items: { name: string; text: string }[] }[] = [
  {
    heading: "UP: our relationship with Jesus",
    items: [
      { name: "Spiritual disciplines", text: "regular prayer, Scripture and personal devotion." },
      { name: "A whole life of worship", text: "honouring God relationally, mentally, physically and spiritually." },
      { name: "Rest and Sabbath", text: "prioritising rest and time with God through Sabbath." },
    ],
  },
  {
    heading: "IN: our responsibility to Avenue",
    items: [
      {
        name: "Showing up",
        text: "regular participation in Prayer and Praise, Pathway gatherings, Pathway Huddles and leadership meetings.",
      },
      { name: "Dependability", text: "doing what we say we'll do, building trust in the team and the community." },
      { name: "Clear communication", text: "open, honest and timely communication with other leaders." },
      {
        name: "Multiplying leaders",
        text: "every leader has an apprentice and is intentionally discipling believers, with teaching consistent with the beliefs of the Seventh-day Adventist Church.",
      },
    ],
  },
  {
    heading: "OUT: reflecting Jesus in the world",
    items: [
      {
        name: "Family and financial integrity",
        text: "our families and key relationships are a priority, and we show integrity in how we handle money.",
      },
      { name: "Self-control", text: "avoiding drunkenness and intoxication." },
      {
        name: "Relationships",
        text: "keeping romantic relationships accountable and Christ-centred, following biblical standards of sexual ethics and faithfulness.",
      },
      { name: "Reputation", text: "our social media and public life are consistent with Scripture and reflect Jesus." },
      { name: "Modesty and respect", text: "presenting ourselves modestly and respectfully, inside and outside the church." },
    ],
  },
];

export const BOARD_ASKS = [
  "Embodies Avenue's values and is passionate about its vision",
  "Has a practising devotional and prayer life",
  "Is actively committed to Avenue's weekly rhythms",
  "Attends monthly board meetings and other required meetings",
  "Is involved in active discipleship, with an apprentice of their own",
  "Is a member of the Victorian Conference of the Seventh-day Adventist Church",
];

export const BOARD_ROLES: { role: string; focus: string; reportsTo: string; leads: string; duties: string[] }[] = [
  {
    role: "Leader / Chair",
    focus: "Vision and strategy",
    reportsTo: "Conference, Board",
    leads: "All directors, teaching team, strategic planning",
    duties: [
      "Cast and articulate church-wide vision and values",
      "Lead the board and coordinate strategic direction",
      "Oversee the teaching calendar, including the Avenue Podcast, and the core discipleship strategy",
      "Represent Avenue externally, including to the Victorian Conference and partner organisations",
      "Coach and empower each director",
      "Discern new opportunities for growth and multiplication",
    ],
  },
  {
    role: "Secretary / Administrative Director",
    focus: "Systems and organisation",
    reportsTo: "Lead Pastor, Conference, Board",
    leads: "Admin assistants, communications team",
    duties: [
      "Organise board meetings: schedule, agenda, minutes and follow-up",
      "Maintain Google Workspace (Calendar, Drive, Admin, email accounts) and Planning Center",
      "Work with the communications team so upcoming events are promoted in good time",
      "Maintain systems for onboarding, leadership development and board reporting",
      "Liaise with the Victorian Conference admin alongside the Chair",
      "Manage logistics for gatherings, including venue bookings and acting as the contact for Mont Albert staff",
    ],
  },
  {
    role: "Finance Director",
    focus: "Stewardship and sustainability",
    reportsTo: "Lead Pastor, Board",
    leads: "Setup teams, logistics, bookkeeping support",
    duties: [
      "Oversee budgeting, reporting and giving systems",
      "Keep the books and make sure people are reimbursed promptly",
      "Work with the Victorian Conference finance department so finances stay within policy",
      "Track spending and align resources with Avenue's priorities",
      "Draft the annual budget with the Lead Pastor and Secretary",
      "Oversee financial planning for events, mission trips and projects",
    ],
  },
  {
    role: "Intersection Director",
    focus: "Worship and prayer",
    reportsTo: "Lead Pastor, Board",
    leads: "Worship leaders on the Prayer and Praise roster, hospitality",
    duties: [
      "Oversee Wednesday night Prayer and Praise and any larger worship events",
      "Build and lead the worship leader team and manage the rotating roster",
      "Support each worship leader to plan their allocated week: theme, worship set, reflection and prayer",
      "Apprentice new worship leaders",
      "Make sure newcomers are welcomed, connected and followed up",
      "Champion a culture of authentic worship and spiritual hunger across Avenue",
    ],
  },
  {
    role: "Pathways Director",
    focus: "Groups and leadership development",
    reportsTo: "Lead Pastor, Board",
    leads: "Coaches, Pathway leaders and apprentices",
    duties: [
      "Oversee all Pathways",
      "Build and lead a team of coaches who support Pathway leaders",
      "Recruit, train and support Pathway leaders and apprentices",
      "Run regular Pathway Huddles, including reviewing the Metrics of Success",
      "Help new people connect into a Pathway",
      "Resource and troubleshoot Pathways for long-term health, and champion multiplication",
    ],
  },
  {
    role: "Streetlights Director",
    focus: "Evangelism, mission and community engagement",
    reportsTo: "Lead Pastor, Board",
    leads: "Pathway leaders (for mission), mission trip leader, Red Frogs leader",
    duties: [
      "Lead Avenue's mission strategy, with Pathways at the centre",
      "Identify local needs through research and community partnerships",
      "Mobilise leaders of projects, events and justice initiatives",
      "Catalyse network-wide initiatives like mission trips and Red Frogs",
      "Keep the mission of God front and centre in Avenue's culture",
    ],
  },
];
