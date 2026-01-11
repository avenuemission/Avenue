// ============================================
// AVENUE WEBSITE CONFIGURATION
// Edit these values to update the website
// ============================================

// Helper to get next Wednesday at 7PM AEDT
const getNextWednesday7PM = (): Date => {
  const now = new Date();
  // Create date in AEDT (UTC+11)
  const aedtOffset = 11 * 60; // minutes
  const localOffset = now.getTimezoneOffset();
  const aedtNow = new Date(now.getTime() + (aedtOffset + localOffset) * 60 * 1000);
  
  const dayOfWeek = aedtNow.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
  
  // If it's Wednesday, check if 7PM has passed
  const target = new Date(aedtNow);
  if (daysUntilWednesday === 0) {
    target.setHours(19, 0, 0, 0);
    if (aedtNow >= target) {
      // Wednesday 7PM has passed, go to next Wednesday
      target.setDate(target.getDate() + 7);
    }
  } else {
    target.setDate(target.getDate() + daysUntilWednesday);
    target.setHours(19, 0, 0, 0);
  }
  
  // Convert back to local time for the Date object
  const targetUTC = new Date(target.getTime() - (aedtOffset + localOffset) * 60 * 1000);
  return targetUTC;
};

// Next Intersection Event (used for countdown across all pages)
export const NEXT_INTERSECTION_EVENT = {
  name: "Prayer & Praise",
  date: getNextWednesday7PM(), // Automatically calculates next Wednesday 7:00 PM AEDT
};

// Statistics for Pathways page (easily updatable)
export const PATHWAY_STATS = {
  communities: 7,
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
  },
  {
    id: 2,
    name: "Heathmont",
    coordinates: [-37.854, 145.225] as [number, number],
    time: "Saturday 12:00 pm",
    coordinator: "Racquel",
    phone: "0477110098",
  },
  {
    id: 3,
    name: "Clyde",
    coordinates: [-38.047, 145.306] as [number, number],
    time: "Saturday 1:30 pm",
    coordinator: "Sam",
    phone: "0477110098",
  },
  {
    id: 4,
    name: "Monash Pathways",
    coordinates: [-37.915, 145.13] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Olivia",
    phone: "0477110098",
  },
  {
    id: 5,
    name: "Blackburn",
    coordinates: [-37.815, 145.193] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Henry",
    phone: "0477110098",
  },
  {
    id: 6,
    name: "Ringwood",
    coordinates: [-37.813, 145.225] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Ash",
    phone: "0477110098",
  },
  {
    id: 7,
    name: "Nunawading",
    coordinates: [-37.817, 145.126] as [number, number],
    time: "Saturday 4:00 pm",
    coordinator: "Aaron",
    phone: "0477110098",
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
  combinedPathways: {
    title: "Combined Pathways",
    description:
      "Once a month, the pathway groups come together and meet for a combined bible discussion. This allows pathways groups to connect and encourage each other.",
    location: "Mont Albert Church",
    time: "3:00 - 6:00 PM First Saturday",
    nextDate: new Date("2026-01-04T16:00:00+11:00"), // First Saturday of January 2026
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
        title: "Song 1",
        youtubeUrl: "https://www.youtube.com/watch?v=vAdf3qHxXfI",
        spotifyUrl: "",
      },
      {
        title: "Song 2",
        youtubeUrl: "https://www.youtube.com/watch?v=RpNYwOE1F00",
        spotifyUrl: "",
      },
      {
        title: "Song 3",
        youtubeUrl: "https://www.youtube.com/watch?v=iuSSYmhcn6Y",
        spotifyUrl: "",
      },
      {
        title: "Song 4",
        youtubeUrl: "https://www.youtube.com/watch?v=2c7kPLRzQ-o",
        spotifyUrl: "",
      },
      {
        title: "Song 5",
        youtubeUrl: "https://www.youtube.com/watch?v=cPZRxCwpS-A",
        spotifyUrl: "",
      },
      {
        title: "Song 6",
        youtubeUrl: "https://www.youtube.com/watch?v=ZuOSWbjgK6g",
        spotifyUrl: "",
      },
      {
        title: "Song 7",
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

// Prayer Hotline Contact
export const PRAYER_HOTLINE = {
  phone: "+61 477110098",
  email: "henry.jamcmahon@gmail.com",
};

// Mission Initiatives
export const MISSION_INITIATIVES = [
  {
    title: "Melbourne Homeless Outreach",
    description:
      "A pathway group that was meeting at Monash University has been blessing the homeless in Melbourne Australia. On saturday evenings, they go into the city, with the intention of being the hands and feet of Jesus.",
  },
  {
    title: "Prayer Hotline",
    description:
      "Avenue provides a 24/7 prayer hotline to anyone in need of divine support.",
    hasContact: true,
  },
  {
    title: "Mission Trips",
    description:
      "Avenue is planning upcoming mission trips to Philippines, Saudi Arabia and Nigeria.",
  },
];
