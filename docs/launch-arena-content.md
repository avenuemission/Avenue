# Launch Scenarios: principles and curveballs

**Status:** First draft for Henry to edit. Nothing here is final.
**Date:** 2026-09-23. Renamed from "the Arena" to "Scenarios" on 2026-09-28, with the
months removed and a Metrics step added before it.

Six scenarios, played against the leader's own plan at step 9 of the Launch wizard, before
a leader commits. Three metrics move: **Pathways**, **Intersections**, **Streetlights**. No
grade at the end, just the principles they learned and where their plan is thinnest.

In code the scenarios are still called the Arena (`src/content/arena.ts`,
`src/lib/domain/arena.ts`), and a leader's run is saved under the `arena` section, so no
saved progress was lost in the rename.

## Step 8: Metrics

A read-only step just before the scenarios. It shows:

- Eyebrow "Metrics", title "How we measure a healthy group".
- "Avenue tracks the health of every pathway with three simple metrics. They are not a
  score to chase. They show whether your group is growing the way Jesus grows His church.
  You'll see them move in the scenarios next."
- The three metrics and their meanings (one source, `COUNTER_NAMES` and
  `COUNTER_MEANINGS` in `src/lib/domain/arena.ts`, shared with the scenarios' score key):
  - **Pathways**: People who feel they belong and invite others
  - **Intersections**: People who come to faith and are apprenticed
  - **Streetlights**: Disciples who step out to lead or serve
- One button, "Continue to scenarios", which saves `{ read: true }` under the `metrics`
  section and moves on.

The step counts as done once read, or when the leader has already started or finished the
scenarios (so a leader who finished Launch before the step existed stays finished). It is
not one of the seven planning steps, so Launch counts and totals are unchanged.

⚠️ **Henry, please check every scripture reference.** They are drawn from memory and
should be verified before any of this ships. The Ferguson anchors are from Hero Maker and
Multiplier.

---

## How to read this

Each curveball has a situation, the plan gaps that make it bite harder, and four choices.
Each choice carries:

- **Verdict**: one line, said plainly
- **Counters**: how the three metrics (Pathways, Intersections, Streetlights) move
- **Principle**: the named lesson, which is the whole point
- **Anchor**: where it comes from

Metrics move in small honest numbers. A new group might finish the six scenarios on four
Pathways, one Intersection, zero or one Streetlight.

**No choice is a trap.** Every option should be something a real leader might reasonably
pick. The weaker ones cost something and still teach.

---

## The default six

Scenarios 1 to 6 run curveballs 1, 2, 4, 5, 8, 7 in that order. The arc is deliberate: the
group forms, the leader is tested, the mission stalls, the room fills, the leader empties,
and finally someone else wants to go. Curveballs 3, 6, 9 and 10 are the alternate pool for
a replay.

---

## 1. Someone quietly stops coming

**Scenario 1.** One of your first regulars has missed three weeks. No argument, no
explanation. They still reply to messages, just briefly.

**Bites harder if:** no rhythm was set, or the leader named no one to share the shepherding
with.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Go and see them, in person, this week | They needed to be missed, and now they know they were. | Pathways +1 | People do not leave groups, they leave being unnoticed. | Luke 15, the shepherd who goes after the one |
| Send a warm message and leave the door open | Kind, and it keeps the door open, but a message is easy to leave unanswered. | No change | A text respects their space. A visit says they matter. | Acts 2:46, meeting house to house |
| Ask someone else in the group to reach out | You just gave away your first piece of ministry, and it worked. | Pathways +1, Streetlights +1 | Do not do alone what someone else could learn to do with you. | Hero Maker, Permission Giving |
| Give them room and wait for them to come back | Some people do come back. Most quietly conclude they were not needed. | Pathways -1 | Waiting feels like respect. It usually reads as indifference. | Ezekiel 34, the shepherds who did not search |

---

## 2. You are sick the week you are hosting

**Scenario 2.** You wake up on the day genuinely unwell. The group is at your place in eight
hours.

**Bites harder if:** no co-leader or apprentice was named in the plan. If the leader listed
nobody, options C and D are the only realistic ones and the scenario should say so plainly.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Push through and host anyway | The group happened. You paid for it for a week, and they could tell. | Pathways +1, leader capacity strained | A leader who never misses a week teaches the group that it depends on them. | Exodus 18, Jethro tells Moses he will wear himself out |
| Hand it to your apprentice and let them lead | They were ready sooner than you thought. You watched from your couch. | Pathways +1, Streetlights +1 | The fastest way to raise a leader is to be unavailable on purpose. | Hero Maker, the apprenticeship step of you do, I watch |
| Cancel for the week | Honest, and nobody minded. The rhythm took a small knock. | No change | Cancelling once is rest. Cancelling twice is a pattern. | Mark 6:31, come away and rest a while |
| Move it online at short notice | It held the rhythm. It was not the same room. | No change | A rhythm is worth protecting, but presence is the thing you are actually building. | Acts 2:42, they devoted themselves together |

---

## 3. One person dominates every conversation

**Alternate pool.** One member answers every question, at length. Two quieter people have
stopped speaking entirely.

**Bites harder if:** the group is already at or above the room's comfortable size.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Talk to them privately, kindly and directly | Hard conversation, had early, in private. The room changed the next week. | Pathways +1 | The kindest thing you can do for a group is have the awkward conversation early. | Matthew 18:15, go and speak to them privately |
| Change the format so everyone answers | The structure did the work without singling anyone out. | Pathways +1 | Sometimes the fix is the format, not the person. | 1 Corinthians 14:26, each one has something to bring |
| Give them a job that uses the energy | You turned a problem into a contribution. Watch that it does not become a platform. | Pathways +1, Streetlights +1 | Strong personalities are usually misplaced gifts. | Hero Maker, Gift Activating |
| Say nothing and hope it settles | It did not settle. The quiet people got quieter. | Pathways -1 | Avoiding conflict is not peacemaking. It is deferring the cost onto the quietest person in the room. | Proverbs 27:5, better open rebuke than hidden love |

---

## 4. Nobody has invited anyone in two months

**Scenario 3.** The group is warm, consistent and completely closed. Everyone loves it. Nobody
has brought a friend.

**Bites harder if:** no mission group was named, or no third space was identified.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Name it honestly with the group | Saying it out loud broke the spell. Two people brought someone within a month. | Pathways +2 | A group that is not growing is usually not unwilling, just unasked. | Matthew 28:19, as you go, make disciples |
| Move a gathering into your third space | Meeting where their friends already are made inviting feel normal. | Pathways +1 | It is easier to invite someone to a cafe than to your lounge room. | Avenue's three spaces, and Luke 10 going to where people are |
| Model it yourself and invite someone | You went first. Nobody could say it was not possible. | Pathways +1 | You cannot ask a group to do what they have never seen you do. | 1 Corinthians 11:1, follow me as I follow Christ |
| Focus on depth for now and invite later | The group went deeper and stayed closed. Later never quite arrived. | Pathways -1 | A group that waits until it is ready to invite will never be ready. | John 4, the woman at the well told people immediately |

---

## 5. The group outgrows your living room

**Scenario 4.** Twelve people in a room that seats eight. Two sat on the floor. Someone joked
about needing a bigger house.

**Bites harder if:** hosting in a 1st space home, and no apprentice has been named. This is
the moment the plan's thin spots show.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Multiply into two groups, with your apprentice leading one | Hard, and right. Two tables where there was one. | Pathways +1, Streetlights +1 | Multiplication always feels like loss before it feels like growth. | 2 Timothy 2:2, entrust it to those who will teach others |
| Find a bigger room and stay together | Everyone stayed, and the room got quieter. Big rooms make guests of people. | Pathways -1 | Adding is easier than multiplying. It is also where most groups stop. | Hero Maker, Multiplication Thinking |
| Cap the group and start a waiting list | Protected what you had. Told six people there was no room for them. | Pathways -1 | A closed table is a comfortable table. It is not a Pathway. | Luke 14:23, go out and compel them to come in |
| Split the gathering into two times, same leader | Bought yourself three months, and doubled your own load. | Pathways +1, leader capacity strained | Two gatherings led by one person is not multiplication. It is a slower burnout. | Exodus 18, Moses judging alone from morning to evening |

---

## 6. Someone comes in crisis

**Alternate pool.** A member arrives carrying something heavy: a marriage falling apart, a
job lost, a diagnosis. It is more than a small group can hold on its own.

⚠️ Henry, this one needs your eye most. It has to be pastorally right, and it must not
suggest the group abandons anyone.

**Bites harder if:** the leader has no coach relationship recorded and no one to call.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Carry it as a group, and bring in help from the church | The group learned what it is actually for, and you did not carry it alone. | Pathways +2 | A Pathway is not a programme. It is the people who show up when it gets heavy. | Galatians 6:2, carry each other's burdens |
| Care for them personally, outside the group | They were loved well. The group never learned it could do this. | Pathways +1, leader capacity strained | If care only ever flows through you, you have built a hub, not a family. | Acts 6, the seven appointed so the work could spread |
| Refer them on to professional support and keep the group as it was | The right referral, made early, is care. Just do not let it become a handoff. | No change | Knowing your limits is wisdom. Disappearing behind them is not. | Proverbs 11:14, in many counsellors there is safety |
| Make it the group's whole focus for a season | Deeply loving, and the group slowly became about one person. | Pathways -1 | Compassion without boundaries eventually helps no one. | Mark 1:38, Jesus moves on to the next towns |

---

## 7. Two people want to start something of their own

**Scenario 6, and the best problem in the list.** Two of your people have been talking. They
want to start a Pathway in their own street.

**Bites harder if:** neither has been apprenticed past the early rungs. The scenario should
note that plainly: releasing someone you have not trained is not sending, it is hoping.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Bless them and send them, staying alongside | You lost two people and gained a group. That is the trade. | Pathways -1, Streetlights +2 | Sending always costs the sender. That cost is the point. | Acts 13:2, set apart Barnabas and Saul and sent them off |
| Apprentice them properly first, then send | Slower, and they will survive their first hard month. | Streetlights +1, Intersections +1 | Do not send people you have not walked with. Readiness is built, not declared. | Mark 3:14, appointed to be with him, and then sent out |
| Ask them to wait until the group is stronger | Reasonable. Also how most movements quietly stop. | Streetlights -1 | A leader who waits for the perfect moment to release people never releases anyone. | Matthew 25, the servant who buried what he was given |
| Let them go and step back entirely | They went with your blessing and without your support. One group survived. | Streetlights +1, Pathways -1 | Releasing is not the same as abandoning. Sent people still need a sender. | Hero Maker, Permission Giving followed by real support |

---

## 8. You are running on empty

**Scenario 5.** You have led every week, hosted most of them, and had two hard conversations.
You are not enjoying it any more and you have not said so to anyone.

**Bites harder if:** no coach relationship, no apprentice, and this is the scenario that
should reference their own RPMS check-in if they have one.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Tell your coach honestly and get help | Saying it out loud was most of the fix. | Capacity restored | A leader who will not be pastored will not last. | 1 Kings 19, Elijah is fed and rested before he is recommissioned |
| Hand real responsibility to someone else | You stopped being the only one carrying it, and someone grew. | Streetlights +1, capacity restored | You reproduce who you are, so an exhausted leader reproduces exhaustion. | Multiplier, the RPMS gauges |
| Take two weeks off and let the group run | The group did fine without you. That was the lesson. | Capacity restored, Pathways +1 | If the group cannot survive two weeks without you, that is the problem to fix. | Mark 6:31, come away by yourselves and rest |
| Keep going and get through the season | You made it. Something in you quietly shut down. | Pathways -1, capacity drained | Pushing through is a strategy with a ceiling, and you will meet it. | Exodus 18:18, you will surely wear yourself out |

---

## 9. Someone asks to be baptised

**Alternate pool, and a good curveball.** Someone who came in sceptical five months ago
asks you what baptism means, and then asks if they can do it.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Baptise them with the group present, and start apprenticing them | A decision, witnessed by the people who walked them to it, and a next step the same week. | Intersections +1, Streetlights +1 | A decision without a next step becomes a memory. | Matthew 28:19, baptising and teaching them to obey |
| Baptise them at a church-wide gathering | The wider family celebrated, and the group who walked with them watched from the back. | Intersections +1 | Celebrate publicly, but do not take the moment away from the people who earned it with them. | Acts 2:41 and 2:47, added to their number |
| Ask them to wait and do a course first | Careful. Also slower than the New Testament ever is. | No change | Nobody is ready. Readiness is formed on the way. | Acts 8, the Ethiopian asks what prevents me from being baptised |
| Pass it to the pastors and step back | Handled properly, and you missed your own moment. | Intersections +1, Pathways -1 | You do not have to be qualified to be the one who was there. | John 4, the woman with no training who brought a town |

---

## 10. A hard question splits the room

**Alternate pool.** A genuine theological disagreement surfaces and two people clearly
hold different views. The room goes quiet and looks at you.

| Choice | Verdict | Counters | Principle | Anchor |
|---|---|---|---|---|
| Hold the tension and teach into it | You did not resolve it, and the group learned they could disagree and stay. | Pathways +1 | A group that can hold disagreement is stronger than a group that agrees about everything. | Romans 14, accept the one whose faith is weak without quarrelling |
| Give the answer and move on | Clear, quick, and the quieter view never came back into the room. | No change | Being right is cheap. Keeping someone in the conversation is not. | 1 Corinthians 8:1, knowledge puffs up, love builds up |
| Take it offline with both of them | Wise, and the group missed watching you handle it. | No change | Some things are handled privately. Some things the group needs to see handled. | Matthew 18, the escalation runs private first |
| Say every view is equally valid | Peaceful in the room, and it taught the group that nothing much is at stake. | Pathways -1 | Avoiding the question is not unity, it is just quiet. | Ephesians 4:15, speaking the truth in love |

---

## The ending

No grade. Two things:

1. **The principles you learned**, listed back in the order they were earned, with the
   choice that taught each one.
2. **Where your plan is thinnest**, named plainly, drawn from the gaps the scenarios
   pressed on. For example: "You have not named an apprentice. It made 3 of your scenarios
   harder."

Both carry into the Launch Plan one-pager.

---

## What Henry needs to decide

- ❓ Are the four choices per curveball genuinely the four a real Avenue leader would
  consider, or are any of them straw men?
- ❓ Curveball 6, the crisis, needs the most pastoral care. Is the framing right?
- ❓ Are the counter movements the right size, or should a single good choice move Pathways
  by more?
- ❓ Should Intersections only move on curveball 9, or are there other honest routes to a
  decision of faith across the six scenarios?
- ❓ Every scripture reference needs checking before this ships.
