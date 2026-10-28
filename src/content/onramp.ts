// Avenue On-Ramp: the leadership training day at /onramp. Every word the
// page and the confirmation email show about the event lives here.
//
// To set the venue, change VENUE below (for example "Mont Albert Church,
// 23 Example St"). Nothing else needs to change.
const VENUE = "Venue TBC";

export const ONRAMP = {
  title: "Avenue On-Ramp",
  tagline: "Your first step into leading.",
  kind: "Leadership training day",
  date: "Sunday 15 November 2026",
  shortDate: "Sunday 15 November",
  time: "9am–4:30pm",
  venue: VENUE,
  note: "No experience needed",
} as const;

// The workshops a sign-up can pick, at least 1 and at most 2. The id is
// what the database stores, so never change an id once sign-ups exist;
// the label can change freely.
export const ONRAMP_WORKSHOPS = [
  { id: "worship", label: "Worship leading", host: "Matt" },
  { id: "communication", label: "Communication: public speaking, teaching the Bible + podcasting", host: "Jeremy" },
  { id: "digital", label: "Digital mission: comms, social media + tech", host: "Zoey" },
  { id: "creative", label: "Running creative evangelistic spaces", host: "Ash" },
] as const;

export type OnrampWorkshopId = (typeof ONRAMP_WORKSHOPS)[number]["id"];

export const ONRAMP_MIN_WORKSHOPS = 1;
export const ONRAMP_MAX_WORKSHOPS = 2;
