// One passage per phase (spec 5), New Living Translation. Henry, 24 Sep:
// "just put in NLT, I will check later". The text was typed from memory,
// so every entry carries a marker for his check. Each quote is followed by
// "(NLT)" where it is shown, and the journey footer carries NLT_NOTICE.
import type { StopId } from "@/lib/domain/avenue";

export interface PhaseVerse {
  reference: string; // full reference, shown under the verse
  short: string; // chapter only, for the "Stop N of 5" line
  text: string | null; // null shows the reference as the headline instead
}

export const VERSES: Record<StopId, PhaseVerse> = {
  phase1: {
    reference: "Acts 2:42",
    short: "Acts 2",
    // NLT: Henry to verify wording
    text: "All the believers devoted themselves to the apostles' teaching, and to fellowship, and to sharing in meals (including the Lord's Supper), and to prayer.",
  },
  phase2: {
    reference: "Ephesians 4:11–12",
    short: "Ephesians 4",
    // NLT: Henry to verify wording
    text: "Now these are the gifts Christ gave to the church: the apostles, the prophets, the evangelists, and the pastors and teachers. Their responsibility is to equip God's people to do his work and build up the church, the body of Christ.",
  },
  phase3: {
    reference: "Nehemiah 2:17–18",
    short: "Nehemiah 2",
    // NLT: Henry to verify wording
    text: "But now I said to them, \"You know very well what trouble we are in. Jerusalem lies in ruins, and its gates have been destroyed by fire. Let us rebuild the wall of Jerusalem and end this disgrace!\" Then I told them about how the gracious hand of God had been on me, and about my conversation with the king. They replied at once, \"Yes, let's rebuild the wall!\" So they began the good work.",
  },
  phase4: {
    reference: "Exodus 18:17–18",
    short: "Exodus 18",
    // NLT: Henry to verify wording
    // The NLT has a dash after "wear yourself out"; this site uses no long
    // dashes, so it is a comma here.
    text: "\"This is not good!\" Moses' father-in-law exclaimed. \"You're going to wear yourself out, and the people, too. This job is too heavy a burden for you to handle all by yourself.\"",
  },
  phase5: {
    reference: "2 Timothy 2:2",
    short: "2 Timothy 2",
    // NLT: Henry to verify wording
    text: "You have heard me teach things that have been confirmed by many reliable witnesses. Now teach these truths to other trustworthy people who will be able to pass them on to others.",
  },
};

export const NLT_NOTICE =
  "Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.";
