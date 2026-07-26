// ============================================
// AVENUE WEBSITE CONFIGURATION
// Edit these values to update the website
// ============================================

// Returns Melbourne UTC offset in hours, accounting for DST.
// AEDT = UTC+11 (DST: first Sun Oct – first Sun Apr)
// AEST = UTC+10 (standard: first Sun Apr – first Sun Oct)
const getMelbourneOffsetHours = (date: Date): number => {
  const year = date.getUTCFullYear();
  const dstStart = new Date(Date.UTC(year, 9, 1)); // Oct 1 UTC
  dstStart.setUTCDate(1 + (7 - dstStart.getUTCDay()) % 7); // first Sunday of Oct
  const dstEnd = new Date(Date.UTC(year, 3, 1)); // Apr 1 UTC
  dstEnd.setUTCDate(1 + (7 - dstEnd.getUTCDay()) % 7); // first Sunday of Apr
  const inDST = date >= dstStart || date < dstEnd;
  return inDST ? 11 : 10;
};

// Helper to get next Wednesday at 7PM Melbourne time (DST-aware)
const getNextWednesday7PM = (): Date => {
  const now = new Date();
  const melbOffset = getMelbourneOffsetHours(now);
  const localOffset = now.getTimezoneOffset();
  const melbNow = new Date(now.getTime() + (melbOffset * 60 + localOffset) * 60 * 1000);

  const dayOfWeek = melbNow.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;

  const target = new Date(melbNow);
  if (daysUntilWednesday === 0) {
    target.setHours(19, 0, 0, 0);
    if (melbNow >= target) {
      target.setDate(target.getDate() + 7);
    }
  } else {
    target.setDate(target.getDate() + daysUntilWednesday);
    target.setHours(19, 0, 0, 0);
  }

  // Recalculate offset for the target date (it may cross a DST boundary)
  const targetApproxUTC = new Date(target.getTime() - (melbOffset * 60 + localOffset) * 60 * 1000);
  const targetOffset = getMelbourneOffsetHours(targetApproxUTC);
  const targetUTC = new Date(target.getTime() - (targetOffset * 60 + localOffset) * 60 * 1000);
  return targetUTC;
};

// Next Intersection Event (used for countdown across all pages)
export const NEXT_INTERSECTION_EVENT = {
  name: "Prayer & Praise",
  date: getNextWednesday7PM(), // Automatically calculates next Wednesday 7:00 PM AEDT
};

// Statistics for Pathways page (easily updatable)
export const PATHWAY_STATS = {
  communities: 6,
  countries: 1,
  languages: 5,
  newGroupsStartingSoon: 3,
};

// Pathway Groups Data
export const PATHWAY_GROUPS = [
  {
    id: 1,
    name: "Donvale",
    coordinates: [-37.769, 145.149] as [number, number],
    time: "Saturday 10:00 am",
    coordinator: "Matt",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
  {
    id: 2,
    name: "Heathmont",
    coordinates: [-37.854, 145.225] as [number, number],
    time: "Saturday 12:00 pm",
    coordinator: "Racquel",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
  {
    id: 3,
    name: "Clyde",
    coordinates: [-38.047, 145.306] as [number, number],
    time: "Saturday 1:30 pm",
    coordinator: "Sam",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
  {
    id: 4,
    name: "Monash Pathways",
    coordinates: [-37.915, 145.13] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Olivia",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
  {
    id: 5,
    name: "Blackburn",
    coordinates: [-37.815, 145.193] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Henry",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
  {
    id: 6,
    name: "Ringwood",
    coordinates: [-37.813, 145.225] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Ash",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
  {
    id: 7,
    name: "Nunawading",
    coordinates: [-37.817, 145.126] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Aaron",
    phone: "0477110098",
    running: true,
    description: "Pathway groups are house church communities growing together empowered by the Spirit of God.",
  },
];

// Intersection Events
export const INTERSECTION_EVENTS = {
  prayerAndPraise: {
    title: "Prayer & Praise",
    description:
      "This is a space for worship through the expression of music and prayer. This is a midweek moment of thanks and renewal of the spirit.",
    location: "Mont Albert Church",
    time: "7:00 - 9:00 PM Wednesday",
    nextDate: new Date("2025-12-10T19:00:00+11:00"),
  },
  weekOfWorship: {
    title: "Week of Worship",
    description:
      "A dedicated week of spiritual growth, prayer, and praise. Avenue comes together for an immersive experience of worship, reflection, and deepening our connection with God.",
    location: "Mont Albert Church",
    time: "7:00 PM Daily",
    nextDate: new Date("2026-01-04T16:00:00+11:00"),
  },
  quarterlySermon: {
    title: "Quarterly Sermon",
    description:
      "Once a quarter, Avenue come together for a more traditional style church service, where theme inspired revelations are shared.",
    location: "Mont Albert Church",
    time: "3:00 - 6:00 PM 3rd of March",
    nextDate: new Date("2025-12-17T16:00:00+11:00"),
  },
};

// Social Media Links
export const SOCIAL_LINKS = {
  youtube: "https://www.youtube.com/@avenuemission/featured",
  instagram: "https://www.instagram.com/avenuemission/",
  linkedin: "https://linkedin.com/company/avenue-mission",
  googleCalendar:
    "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney",
  facebook: "https://www.facebook.com/avenuemission",
};

// Streetlights - Creative Initiatives
export const CREATIVE_INITIATIVES = {
  homeboundAlbum: {
    title: "Homebound Album",
    songs: [
      {
        title: "Just Like Fruit Salad",
        youtubeUrl: "https://www.youtube.com/watch?v=vAdf3qHxXfI",
        spotifyUrl: "",
      },
      {
        title: "Delivery",
        youtubeUrl: "https://www.youtube.com/watch?v=RpNYwOE1F00",
        spotifyUrl: "",
      },
      {
        title: "Luke 18 (Like the Others)",
        youtubeUrl: "https://www.youtube.com/watch?v=iuSSYmhcn6Y",
        spotifyUrl: "",
      },
      {
        title: "Home to Zion",
        youtubeUrl: "https://www.youtube.com/watch?v=2c7kPLRzQ-o",
        spotifyUrl: "",
      },
      {
        title: "Back to Eden",
        youtubeUrl: "https://www.youtube.com/watch?v=cPZRxCwpS-A",
        spotifyUrl: "",
      },
      {
        title: "Reigns Supreme",
        youtubeUrl: "https://www.youtube.com/watch?v=ZuOSWbjgK6g",
        spotifyUrl: "",
      },
      {
        title: "Send Me Out",
        youtubeUrl: "https://www.youtube.com/watch?v=4Gg0x-TNFw8",
        spotifyUrl: "",
      },
    ],
  },
  pathwaysPodcast: {
    title: "Pathways Podcast",
    spotifyUrl:
      "https://open.spotify.com/show/127V2svOSv6x4Xh6Uu6ZaH?si=PHHs0GzwRLqIkqkPqI8M4Q&nd=1&dlsi=21621dab8d0f4790",
  },
  saturdayClub: {
    title: "The Saturday Club",
    instagramUrl: "https://www.instagram.com/thesaturdayclubau/",
  },
};

// Mission Initiatives
export const MISSION_INITIATIVES = [
  {
    id: "technological-stewardship",
    title: "Technological Stewardship",
    shortDescription: "Researching how Christians can steward AI for kingdom building while guarding against its dangers.",
    fullDescription:
      "A research initiative exploring how Christians use AI, examining its impact on spiritual formation, ministry effectiveness, ethical frameworks, and eschatological implications. Through surveys, workshops, and theological reflection, we seek to equip the Church to be proactive in shaping technology rather than reactive to cultural definitions. The findings will inform denominational strategies, conference discussions, and practical guidance for believers navigating the AI revolution with wisdom and faithfulness.",
  },
  {
    id: "homeless-outreach",
    title: "Melbourne Homeless Outreach",
    shortDescription: "Blessing the homeless in Melbourne every Saturday evening.",
    fullDescription:
      "A pathway group that was meeting at Monash University has been blessing the homeless in Melbourne Australia. On Saturday evenings, they go into the city, with the intention of being the hands and feet of Jesus. They provide food, warm clothing, and most importantly, genuine connection and prayer for those experiencing homelessness.",
  },
  {
    id: "philippines-mission",
    title: "Philippines Mission Trip",
    shortDescription: "December 2026 mission to breathe revival into Filipino youth.",
    fullDescription:
      "Join us on a transformative mission trip to share Avenue's microchurch philosophy and breathe revival into Filipino youth. We will also provide medical resources and check-ups to those in rural communities, bringing both spiritual and physical healing to those in need.",
    date: "2026-12-01",
    image: "/images/Phillippines.png",
    isFeatured: true,
  },
  {
    id: "red-frogs",
    title: "Red Frogs",
    shortDescription: "Supporting young people at festivals and events.",
    fullDescription:
      "Avenue partners with Red Frogs Australia to provide practical support and care for young people at music festivals, schoolies events, and university O-weeks. Our volunteers offer free pancakes, water, and a safe presence to help keep young people safe during celebrations. It's an opportunity to show God's love through simple acts of service and genuine care.",
    image: "/images/red_frogs.png",
  },
];
