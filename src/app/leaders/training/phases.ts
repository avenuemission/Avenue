// Phase Types
export interface Episode {
  id: string;
  title: string;
  youtubeId: string;
  watched: boolean;
}

export interface Module {
  id: string;
  title: string;
  type: "video" | "quiz" | "document" | "action";
  description: string;
  duration?: string;
  completed: boolean;
  sectionHeader?: string;
  episodes?: Episode[];
}

export interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  scripture: string;
  description: string;
  modules: Module[];
  locked: boolean;
}

// Initial Phase Data
export const INITIAL_PHASES: Phase[] = [
  {
    id: "phase1",
    number: 1,
    title: "Foundations",
    subtitle: "Acts 2:42-47",
    scripture: "Acts 2:42-47",
    description: "In the early church, the framework laid out for what the church is was simple. After Pentecost, people journeyed as disciples of Jesus from household to household. They read the word together, prayed, fellowshipped, and ate together (Acts 2:42). Together, the church praised God, enjoyed each other's company as the Lord added people who were being saved (Acts 2:47). At the heart of what makes up the DNA of a church is 3 things: worship, community and mission. These 3 expressions are what we define as a minimum ecclesiology. Whenever Jesus is Lord, people feel a part of a family and have a mission for their world; church exists. We have set up our church around these 3 essential aspects of church.",
    locked: false,
    modules: [
      {
        id: "p1m0",
        title: "Avenue DNA",
        type: "video",
        description: "Understanding the mission, vision, and strategy of Avenue",
        duration: "5 episodes",
        completed: false,
        episodes: [
          { id: "p1m0e1", title: "1. The Mission", youtubeId: "-yjMDB8OXsg", watched: false },
          { id: "p1m0e2", title: "2. The Vision", youtubeId: "etpNJoyRNZ0", watched: false },
          { id: "p1m0e3", title: "3. The Values", youtubeId: "Lkx09wZpFmw", watched: false },
          { id: "p1m0e4", title: "4. What is a Microchurch?", youtubeId: "0EE9n_LEMtw", watched: false },
          { id: "p1m0e5", title: "5. Living as a Healthy Family", youtubeId: "uod2tVf0M6E", watched: false },
        ],
      },
      {
        id: "p1m1",
        title: "Pathways",
        type: "video",
        description: "Core training module: leading and facilitating pathway groups",
        duration: "3 parts",
        completed: false,
        episodes: [
          { id: "p1m1e1", title: "1. How do I start my leadership journey?", youtubeId: "CDyxXOcMIJw", watched: false },
          { id: "p1m1e2", title: "2. What is required of me as a leader?", youtubeId: "rYxLb_jBdiU", watched: false },
          { id: "p1m1e3", title: "3. Leading a Bible Discussion", youtubeId: "dQTBIhpfpq4", watched: false },
        ],
      },
      {
        id: "p1m2",
        title: "Intersection",
        type: "video",
        description: "Core training module: running intersection events and gatherings",
        duration: "1 video",
        completed: false,
        episodes: [
          { id: "p1m2e1", title: "1. Gathering for Worship", youtubeId: "-TEHae7KRx4", watched: false },
        ],
      },
      {
        id: "p1m3",
        title: "Streetlights",
        type: "video",
        description: "Core training module: creative and mission initiatives",
        duration: "5 parts",
        completed: false,
        episodes: [
          { id: "p1m3e1", title: "1. An Overview of Streetlights", youtubeId: "-Aj49FeIiT8", watched: false },
          { id: "p1m3e2", title: "2. The Core Mission", youtubeId: "LDbaw6ipOmM", watched: false },
          { id: "p1m3e3", title: "3. Defining Your Mission Field", youtubeId: "rJjcWIlndb4", watched: false },
          { id: "p1m3e4", title: "4. The BLESS Model for Evangelism", youtubeId: "qJ6PAfMmACY", watched: false },
          { id: "p1m3e5", title: "5. Personal and Financial Support for Initiatives", youtubeId: "Va4WjPK1U8M", watched: false },
        ],
      },
    ],
  },
  {
    id: "phase2",
    number: 2,
    title: "Calling",
    subtitle: "Ephesians 4",
    scripture: "Ephesians 4",
    description: "We are all one body with many parts (Ephesians 4). Each person is uniquely gifted and called by God to serve in a specific way. Just as Pentecost unleashed a diverse community of Spirit-filled people, this phase helps you discern your calling, understand your gifts, and align your leadership with Avenue's mission and theology.",
    locked: false,
    modules: [
      { id: "p2m1", title: "Discernment of Calling", type: "video", description: "Understanding internal and external calling", duration: "18 min", completed: false },
      { id: "p2m2", title: "APEST Quiz", type: "quiz", description: "Identify your leadership function", completed: false },
      { id: "p2m3", title: "Spiritual Gifts Assessment", type: "quiz", description: "Discover your spiritual gifts", completed: false },
      { id: "p2m4", title: "Strengths & Growth Areas", type: "document", description: "Personal leadership traits analysis", completed: false },
      { id: "p2m6", title: "Theology & Character Conversations", type: "action", description: "Conversations with board or pastors about core theology and character", completed: false },
    ],
  },
  {
    id: "phase3",
    number: 3,
    title: "Launch",
    subtitle: "Nehemiah Approach",
    scripture: "Nehemiah 1–2",
    description: "Nehemiah had the responsibility of rebuilding the walls of Jerusalem, when embarking on a new ministry endeavour, here are some leadership principles we see. When Nehemiah heard the state of his city and the walls fallen down, he starts by brings his sorrow to prayer and fasting (Neh. 1). When he arrives in Jerusalem, he creates a core team, taking a few men with him and doesn't tell anyone what God had laid on his heart (Neh. 2:11-15). He then establishes a strong 'why' and emphasises the importance of his project and from there they get to work (Neh. 2:17-18). Even with opposition, Nehemiah is reminded of the calling God had placed on his life and does the work faithfully (2:19-20).",
    locked: false,
    modules: [
      { id: "p3m1", title: "Planning Pathways", type: "document", description: "Fill out a planning document (Nehemiah approach)", completed: false },
      { id: "p3m2", title: "Praying & Fasting About the Launch Team", type: "action", description: "Bring your launch vision to God in prayer and fasting", completed: false },
      { id: "p3m3", title: "Recruiting 2–4 Launch Team Members", type: "action", description: "Identify and invite your core team", completed: false },
      { id: "p3m4", title: "Regular Launch Team Meetings", type: "action", description: "Meeting regularly with the launch team for prayer and fasting", completed: false },
      { id: "p3m5", title: "Identifying a Mission Group", type: "action", description: "Identifying a group to be 'on mission for'", completed: false },
      { id: "p3m6", title: "Finding a Third Space", type: "action", description: "Identifying a third space to connect with your mission group", completed: false },
      { id: "p3m7", title: "Living Intentionally", type: "action", description: "Living intentionally with those you're on mission for", completed: false },
      { id: "p3m8", title: "Putting Yourself in a Position of Need", type: "action", description: "Putting yourself in a position of 'need to'", completed: false },
      { id: "p3m9", title: "Planning an Official Launch Date", type: "action", description: "Planning an official launch date to be invitational to friends and family", completed: false },
      { id: "p3m12", title: "Weekly MicroChurch Practice", type: "action", description: "Meeting weekly with the launch team to practice being a MicroChurch together", sectionHeader: "Executing Plans (Sending out Luke 10, boldness 2 Corinthians 2)", completed: false },
      { id: "p3m13", title: "Inviting Others", type: "action", description: "Meet up and group chat theory", completed: false },
      { id: "p3m14", title: "Logistics", type: "document", description: "Track important dates (birthdays) and logistics", completed: false },
      { id: "p3m15", title: "Shepherding", type: "action", description: "Looking out for people when they are sick, in need, etc.", completed: false },
    ],
  },
  {
    id: "phase4",
    number: 4,
    title: "Growth",
    subtitle: "Jethro & Moses Model",
    scripture: "Exodus 18",
    description: "Ongoing coaching is essential to the longevity and success of a leader. When Jethro visits Moses, he praises God for the mighty things he's done through Moses (Ex. 18:8) and spends time eating with Moses and the leaders (Ex. 18:12). Then he offers Moses some gentle but crucial advice saying that his current system of managing the people is inefficient, advising Moses to delegate responsibility to other leaders. (Ex. 18:13-23) Moses listens to the wisdom of a counsellor he trusts and is better off for it in the long run (Ex. 18:25-26).",
    locked: false,
    modules: [
      { id: "p4m1", title: "Weekly Check-in / Touch Point (RPMS)", type: "action", description: "Relational weekly touch point using RPMS", completed: false },
      { id: "p4m2", title: "Monthly Pathways Huddles", type: "video", description: "Leader content freshly released at the start of each huddle", duration: "35 min", completed: false },
      { id: "p4m3", title: "Trainings", type: "document", description: "Exponential, internal sermons and podcasts", completed: false },
      { id: "p4m4", title: "Leaders Retreat", type: "action", description: "Annual gathering for replenishment and alignment", completed: false },
    ],
  },
  {
    id: "phase5",
    number: 5,
    title: "Multiply",
    subtitle: "Paul & Timothy Legacy",
    scripture: "2 Timothy 2:2",
    description: "The gospel multiplied through intentional apprenticeship in the New Testament. Barnabus saw something in Saul who became Paul, even when everyone else was afraid of him (Acts 9:26-27). Paul then released many other leaders such as a younger Timothy who he encouraged that things that he had heard from Paul would be passed on to others, who would be able to teach others also (2 Tim. 2:2). Great leaders intentionally reproduce who they are in others, with the fruit of their ministry growing on other people's trees.",
    locked: false,
    modules: [
      { id: "p5m1", title: "Identify an Apprentice", type: "action", description: "Spot potential in future leaders", completed: false },
      { id: "p5m2", title: "ICNU Conversation", type: "video", description: "Have an ICNU conversation with your apprentice", duration: "Coming soon", completed: false },
      { id: "p5m3", title: "Run the Apprenticeship Model", type: "video", description: "Running the apprenticeship model with your apprentice", duration: "Coming soon", completed: false },
      { id: "p5m4", title: "Begin the Five Phases Plan", type: "document", description: "Begin the Five Phases Plan with your apprentice", completed: false },
    ],
  },
];

export type CheckpointStatus = "none" | "requested" | "complete";
