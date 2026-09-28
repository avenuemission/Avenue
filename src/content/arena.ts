// The scenarios content (the Arena in code), transcribed from docs/launch-arena-content.md (first
// draft, 23 Sep). Henry has NOT signed it off yet (handover 3.2): every
// scripture reference is still to be checked, and curveball 6 needs his
// pastoral eye. Henry asked on 24 Sep for it switched on so he can review
// the draft in the real screens. Set it back to false if the review is
// not finished before other leaders reach Launch.
import type { Curveball } from "@/lib/domain/arena";

export const ARENA_ENABLED = true;

// Scenarios 1 to 6, in play order. Curveballs 3, 6, 9 and 10 are the
// alternate pool.
export const DEFAULT_ORDER = [1, 2, 4, 5, 8, 7] as const;

export const CURVEBALLS: Curveball[] = [
  {
    id: 1,
    title: "Someone quietly stops coming",
    situation:
      "One of your first regulars has missed three weeks. No argument, no explanation. They still reply to messages, just briefly.",
    bitesIfNote: "no rhythm was set, or the leader named no one to share the shepherding with.",
    bitesIf: ["noRhythm", "thinTeam"],
    choices: [
      {
        label: "Go and see them, in person, this week",
        verdict: "They needed to be missed, and now they know they were.",
        counters: "Pathways +1",
        principle: "People do not leave groups, they leave being unnoticed.",
        anchor: "Luke 15, the shepherd who goes after the one",
      },
      {
        label: "Send a warm message and leave the door open",
        verdict: "Kind, and it keeps the door open, but a message is easy to leave unanswered.",
        counters: "No change",
        principle: "A text respects their space. A visit says they matter.",
        anchor: "Acts 2:46, meeting house to house",
      },
      {
        label: "Ask someone else in the group to reach out",
        verdict: "You just gave away your first piece of ministry, and it worked.",
        counters: "Pathways +1, Streetlights +1",
        principle: "Do not do alone what someone else could learn to do with you.",
        anchor: "Hero Maker, Permission Giving",
      },
      {
        label: "Give them room and wait for them to come back",
        verdict: "Some people do come back. Most quietly conclude they were not needed.",
        counters: "Pathways -1",
        principle: "Waiting feels like respect. It usually reads as indifference.",
        anchor: "Ezekiel 34, the shepherds who did not search",
      },
    ],
  },
  {
    id: 2,
    title: "You are sick the week you are hosting",
    situation: "You wake up on the day genuinely unwell. The group is at your place in eight hours.",
    bitesIfNote:
      "no co-leader or apprentice was named in the plan. If the leader listed nobody, options C and D are the only realistic ones and the Arena should say so plainly.",
    bitesIf: ["noApprentice", "thinTeam"],
    choices: [
      {
        label: "Push through and host anyway",
        verdict: "The group happened. You paid for it for a week, and they could tell.",
        counters: "Pathways +1, leader capacity strained",
        principle: "A leader who never misses a week teaches the group that it depends on them.",
        anchor: "Exodus 18, Jethro tells Moses he will wear himself out",
      },
      {
        label: "Hand it to your apprentice and let them lead",
        verdict: "They were ready sooner than you thought. You watched from your couch.",
        counters: "Pathways +1, Streetlights +1",
        principle: "The fastest way to raise a leader is to be unavailable on purpose.",
        anchor: "Hero Maker, the apprenticeship step of you do, I watch",
      },
      {
        label: "Cancel for the week",
        verdict: "Honest, and nobody minded. The rhythm took a small knock.",
        counters: "No change",
        principle: "Cancelling once is rest. Cancelling twice is a pattern.",
        anchor: "Mark 6:31, come away and rest a while",
      },
      {
        label: "Move it online at short notice",
        verdict: "It held the rhythm. It was not the same room.",
        counters: "No change",
        principle: "A rhythm is worth protecting, but presence is the thing you are actually building.",
        anchor: "Acts 2:42, they devoted themselves together",
      },
    ],
  },
  {
    id: 3,
    title: "One person dominates every conversation",
    situation: "One member answers every question, at length. Two quieter people have stopped speaking entirely.",
    bitesIfNote: "the group is already at or above the room's comfortable size.",
    bitesIf: [],
    choices: [
      {
        label: "Talk to them privately, kindly and directly",
        verdict: "Hard conversation, had early, in private. The room changed the next week.",
        counters: "Pathways +1",
        principle: "The kindest thing you can do for a group is have the awkward conversation early.",
        anchor: "Matthew 18:15, go and speak to them privately",
      },
      {
        label: "Change the format so everyone answers",
        verdict: "The structure did the work without singling anyone out.",
        counters: "Pathways +1",
        principle: "Sometimes the fix is the format, not the person.",
        anchor: "1 Corinthians 14:26, each one has something to bring",
      },
      {
        label: "Give them a job that uses the energy",
        verdict: "You turned a problem into a contribution. Watch that it does not become a platform.",
        counters: "Pathways +1, Streetlights +1",
        principle: "Strong personalities are usually misplaced gifts.",
        anchor: "Hero Maker, Gift Activating",
      },
      {
        label: "Say nothing and hope it settles",
        verdict: "It did not settle. The quiet people got quieter.",
        counters: "Pathways -1",
        principle:
          "Avoiding conflict is not peacemaking. It is deferring the cost onto the quietest person in the room.",
        anchor: "Proverbs 27:5, better open rebuke than hidden love",
      },
    ],
  },
  {
    id: 4,
    title: "Nobody has invited anyone in two months",
    situation:
      "The group is warm, consistent and completely closed. Everyone loves it. Nobody has brought a friend.",
    bitesIfNote: "no mission group was named, or no third space was identified.",
    bitesIf: ["noMissionGroup"],
    choices: [
      {
        label: "Name it honestly with the group",
        verdict: "Saying it out loud broke the spell. Two people brought someone within a month.",
        counters: "Pathways +2",
        principle: "A group that is not growing is usually not unwilling, just unasked.",
        anchor: "Matthew 28:19, as you go, make disciples",
      },
      {
        label: "Move a gathering into your third space",
        verdict: "Meeting where their friends already are made inviting feel normal.",
        counters: "Pathways +1",
        principle: "It is easier to invite someone to a cafe than to your lounge room.",
        anchor: "Avenue's three spaces, and Luke 10 going to where people are",
      },
      {
        label: "Model it yourself and invite someone",
        verdict: "You went first. Nobody could say it was not possible.",
        counters: "Pathways +1",
        principle: "You cannot ask a group to do what they have never seen you do.",
        anchor: "1 Corinthians 11:1, follow me as I follow Christ",
      },
      {
        label: "Focus on depth for now and invite later",
        verdict: "The group went deeper and stayed closed. Later never quite arrived.",
        counters: "Pathways -1",
        principle: "A group that waits until it is ready to invite will never be ready.",
        anchor: "John 4, the woman at the well told people immediately",
      },
    ],
  },
  {
    id: 5,
    title: "The group outgrows your living room",
    situation:
      "Twelve people in a room that seats eight. Two sat on the floor. Someone joked about needing a bigger house.",
    bitesIfNote:
      "hosting in a 1st space home, and no apprentice has been named. This is the moment the plan's thin spots show.",
    bitesIf: ["homeHosting", "noApprentice"],
    choices: [
      {
        label: "Multiply into two groups, with your apprentice leading one",
        verdict: "Hard, and right. Two tables where there was one.",
        counters: "Pathways +1, Streetlights +1",
        principle: "Multiplication always feels like loss before it feels like growth.",
        anchor: "2 Timothy 2:2, entrust it to those who will teach others",
      },
      {
        label: "Find a bigger room and stay together",
        verdict: "Everyone stayed, and the room got quieter. Big rooms make guests of people.",
        counters: "Pathways -1",
        principle: "Adding is easier than multiplying. It is also where most groups stop.",
        anchor: "Hero Maker, Multiplication Thinking",
      },
      {
        label: "Cap the group and start a waiting list",
        verdict: "Protected what you had. Told six people there was no room for them.",
        counters: "Pathways -1",
        principle: "A closed table is a comfortable table. It is not a Pathway.",
        anchor: "Luke 14:23, go out and compel them to come in",
      },
      {
        label: "Split the gathering into two times, same leader",
        verdict: "Bought yourself three months, and doubled your own load.",
        counters: "Pathways +1, leader capacity strained",
        principle: "Two gatherings led by one person is not multiplication. It is a slower burnout.",
        anchor: "Exodus 18, Moses judging alone from morning to evening",
      },
    ],
  },
  {
    id: 6,
    title: "Someone comes in crisis",
    situation:
      "A member arrives carrying something heavy: a marriage falling apart, a job lost, a diagnosis. It is more than a small group can hold on its own.",
    bitesIfNote: "the leader has no coach relationship recorded and no one to call.",
    bitesIf: [],
    choices: [
      {
        label: "Carry it as a group, and bring in help from the church",
        verdict: "The group learned what it is actually for, and you did not carry it alone.",
        counters: "Pathways +2",
        principle: "A Pathway is not a programme. It is the people who show up when it gets heavy.",
        anchor: "Galatians 6:2, carry each other's burdens",
      },
      {
        label: "Care for them personally, outside the group",
        verdict: "They were loved well. The group never learned it could do this.",
        counters: "Pathways +1, leader capacity strained",
        principle: "If care only ever flows through you, you have built a hub, not a family.",
        anchor: "Acts 6, the seven appointed so the work could spread",
      },
      {
        label: "Refer them on to professional support and keep the group as it was",
        verdict: "The right referral, made early, is care. Just do not let it become a handoff.",
        counters: "No change",
        principle: "Knowing your limits is wisdom. Disappearing behind them is not.",
        anchor: "Proverbs 11:14, in many counsellors there is safety",
      },
      {
        label: "Make it the group's whole focus for a season",
        verdict: "Deeply loving, and the group slowly became about one person.",
        counters: "Pathways -1",
        principle: "Compassion without boundaries eventually helps no one.",
        anchor: "Mark 1:38, Jesus moves on to the next towns",
      },
    ],
  },
  {
    id: 7,
    title: "Two people want to start something of their own",
    situation: "Two of your people have been talking. They want to start a Pathway in their own street.",
    bitesIfNote:
      "neither has been apprenticed past the early rungs. The Arena should note that plainly: releasing someone you have not trained is not sending, it is hoping.",
    bitesIf: ["noApprentice"],
    choices: [
      {
        label: "Bless them and send them, staying alongside",
        verdict: "You lost two people and gained a group. That is the trade.",
        counters: "Pathways -1, Streetlights +2",
        principle: "Sending always costs the sender. That cost is the point.",
        anchor: "Acts 13:2, set apart Barnabas and Saul and sent them off",
      },
      {
        label: "Apprentice them properly first, then send",
        verdict: "Slower, and they will survive their first hard month.",
        counters: "Streetlights +1, Intersections +1",
        principle: "Do not send people you have not walked with. Readiness is built, not declared.",
        anchor: "Mark 3:14, appointed to be with him, and then sent out",
      },
      {
        label: "Ask them to wait until the group is stronger",
        verdict: "Reasonable. Also how most movements quietly stop.",
        counters: "Streetlights -1",
        principle: "A leader who waits for the perfect moment to release people never releases anyone.",
        anchor: "Matthew 25, the servant who buried what he was given",
      },
      {
        label: "Let them go and step back entirely",
        verdict: "They went with your blessing and without your support. One group survived.",
        counters: "Streetlights +1, Pathways -1",
        principle: "Releasing is not the same as abandoning. Sent people still need a sender.",
        anchor: "Hero Maker, Permission Giving followed by real support",
      },
    ],
  },
  {
    id: 8,
    title: "You are running on empty",
    situation:
      "You have led every week, hosted most of them, and had two hard conversations. You are not enjoying it any more and you have not said so to anyone.",
    bitesIfNote:
      "no coach relationship, no apprentice, and this is the month the Arena should reference their own RPMS check-in if they have one.",
    bitesIf: ["noApprentice"],
    choices: [
      {
        label: "Tell your coach honestly and get help",
        verdict: "Saying it out loud was most of the fix.",
        counters: "Capacity restored",
        principle: "A leader who will not be pastored will not last.",
        anchor: "1 Kings 19, Elijah is fed and rested before he is recommissioned",
      },
      {
        label: "Hand real responsibility to someone else",
        verdict: "You stopped being the only one carrying it, and someone grew.",
        counters: "Streetlights +1, capacity restored",
        principle: "You reproduce who you are, so an exhausted leader reproduces exhaustion.",
        anchor: "Multiplier, the RPMS gauges",
      },
      {
        label: "Take two weeks off and let the group run",
        verdict: "The group did fine without you. That was the lesson.",
        counters: "Capacity restored, Pathways +1",
        principle: "If the group cannot survive two weeks without you, that is the problem to fix.",
        anchor: "Mark 6:31, come away by yourselves and rest",
      },
      {
        label: "Keep going and get through the season",
        verdict: "You made it. Something in you quietly shut down.",
        counters: "Pathways -1, capacity drained",
        principle: "Pushing through is a strategy with a ceiling, and you will meet it.",
        anchor: "Exodus 18:18, you will surely wear yourself out",
      },
    ],
  },
  {
    id: 9,
    title: "Someone asks to be baptised",
    situation:
      "Someone who came in sceptical five months ago asks you what baptism means, and then asks if they can do it.",
    bitesIfNote: "",
    bitesIf: [],
    choices: [
      {
        label: "Baptise them with the group present, and start apprenticing them",
        verdict: "A decision, witnessed by the people who walked them to it, and a next step the same week.",
        counters: "Intersections +1, Streetlights +1",
        principle: "A decision without a next step becomes a memory.",
        anchor: "Matthew 28:19, baptising and teaching them to obey",
      },
      {
        label: "Baptise them at a church-wide gathering",
        verdict: "The wider family celebrated, and the group who walked with them watched from the back.",
        counters: "Intersections +1",
        principle: "Celebrate publicly, but do not take the moment away from the people who earned it with them.",
        anchor: "Acts 2:41 and 2:47, added to their number",
      },
      {
        label: "Ask them to wait and do a course first",
        verdict: "Careful. Also slower than the New Testament ever is.",
        counters: "No change",
        principle: "Nobody is ready. Readiness is formed on the way.",
        anchor: "Acts 8, the Ethiopian asks what prevents me from being baptised",
      },
      {
        label: "Pass it to the pastors and step back",
        verdict: "Handled properly, and you missed your own moment.",
        counters: "Intersections +1, Pathways -1",
        principle: "You do not have to be qualified to be the one who was there.",
        anchor: "John 4, the woman with no training who brought a town",
      },
    ],
  },
  {
    id: 10,
    title: "A hard question splits the room",
    situation:
      "A genuine theological disagreement surfaces and two people clearly hold different views. The room goes quiet and looks at you.",
    bitesIfNote: "",
    bitesIf: [],
    choices: [
      {
        label: "Hold the tension and teach into it",
        verdict: "You did not resolve it, and the group learned they could disagree and stay.",
        counters: "Pathways +1",
        principle: "A group that can hold disagreement is stronger than a group that agrees about everything.",
        anchor: "Romans 14, accept the one whose faith is weak without quarrelling",
      },
      {
        label: "Give the answer and move on",
        verdict: "Clear, quick, and the quieter view never came back into the room.",
        counters: "No change",
        principle: "Being right is cheap. Keeping someone in the conversation is not.",
        anchor: "1 Corinthians 8:1, knowledge puffs up, love builds up",
      },
      {
        label: "Take it offline with both of them",
        verdict: "Wise, and the group missed watching you handle it.",
        counters: "No change",
        principle: "Some things are handled privately. Some things the group needs to see handled.",
        anchor: "Matthew 18, the escalation runs private first",
      },
      {
        label: "Say every view is equally valid",
        verdict: "Peaceful in the room, and it taught the group that nothing much is at stake.",
        counters: "Pathways -1",
        principle: "Avoiding the question is not unity, it is just quiet.",
        anchor: "Ephesians 4:15, speaking the truth in love",
      },
    ],
  },
];
