# Avenue at night, round 2: feedback on the live redesign

**Date:** 2026-09-24
**Status:** Approved in chat by Henry ("Go")
**Builds on:** `2026-09-24-avenue-night-design.md` (all of its rules still apply unless this file says otherwise)

## Why

Henry's review of the live "Avenue at night" build: the profile photo is lost in the middle of the dashboard, the phase titles are too big, the Arena's counters are jargon, the RPMS check-in looks dull and unexplained, "recent weeks" is a strip of boxes, and Multiply carries a lot of text that does little.

## Decisions (Henry, 24 Sep, multiple choice)

| Question | Decision |
|---|---|
| Profile photo | Small round photo at the top right of the header on every leader page (dashboard, journey hub, Calling and Launch wizards, Calling Profile, Launch Plan, and the other `/leaders/*` pages that carry the pill header). Tapping it opens the leader's profile panel. The collapsed avatar in the middle of the dashboard is removed |
| Phase titles | About half today's size: about 40 px on phones, about 64 px on desktop |
| Phase intro paragraphs | Show the first two lines, with a "Read more" button that expands the rest (and "Show less" to collapse) |
| Growth layout | Two expanders: **Leader health** (RPMS) and **Church health** (the three metrics). Each has a short intro and a one-line summary when closed. Leader health opens by default when this week's check-in is not saved yet; otherwise both start closed |
| RPMS input | Four sliders, 1 to 10, one colour per gauge, each with a one-line meaning |
| Recent weeks | A month calendar with checked-in weeks marked, plus a 12-week line chart of the four gauges. Tapping a week shows its four scores and its sentence |
| Arena | A "How the Arena keeps score" card before Month 1 defining the three counters in plain words, plus a one-line meaning under each counter |
| Multiply | People first: the person list and the add form lead. The Paul and Timothy teaching and the Hero Maker line move behind a "Why multiply?" expander. The "sending nobody yet" lines shrink to one line and the family tree card becomes a single link |

## 1. Profile photo in the header

- New `HeaderAvatar` component: the leader's photo (or initials, as ProfileCard does today), 36 px visible inside a 44 px button, top right of the page header, `aria-label="My profile"`.
- Tapping opens the existing ProfileCard (view and edit, unchanged behaviour and saving) in a panel: a right-hand sheet on desktop, a full-width sheet from the bottom on phones. Escape and a close button dismiss it; focus returns to the avatar.
- On pages without a pill header (the wizards, Calling Profile, Launch Plan), the avatar sits at the right of the existing top row ("Back to your journey" on the left).
- The avatar is hidden in print.

## 2. Phase openings

- `PhaseOpening` large size: title about `text-[40px]` on phones and `md:text-[64px]`. The small (wizard) size is unchanged.
- Phase intro paragraph (the `phase.description` under the opening on the hub): clamped to two lines with a "Read more" / "Show less" button (44 px target, `aria-expanded`). When the text already fits in two lines, no button shows.

## 3. Growth: Leader health and Church health

Two expanders, each a button row (44 px, `aria-expanded`) with a serif heading, a one-line intro and a closed-state summary:

| Expander | Intro (Henry to check wording) | Closed summary |
|---|---|---|
| Leader health | "How you are doing, in four gauges from Dave Ferguson's Multiplier. One check-in a week." | This week's four scores ("This week: R 7 · P 5 · M 6 · S 8") or "Not checked in this week" |
| Church health | "Who is moving in your community, in three lists: Pathways, Intersections, Streetlights." | The three counts ("Named: 3 · 1 · 0") |

### 3.1 RPMS sliders

- One native `input type="range"` per gauge, min 1, max 10, step 1, full width, thumb and track at least 44 px tall to touch, value shown large beside the label.
- Gauge colours (used only inside Growth, a deliberate exception to "blue and lamp only"):

| Gauge | Colour | Meaning line (Henry to check) |
|---|---|---|
| Relational | rose `#ff8fa3` | Your closest relationships: family, friends, team |
| Physical | green `#6fdca0` | Sleep, food, movement, rest |
| Mental | sky `#7cc7ff` | Focus, stress, emotional load |
| Spiritual | violet `#b9a2ff` | Time with God, prayer, the Word |

- The filled part of each track uses its gauge colour; the unfilled part `--line-2`. Keyboard arrows work (native).
- Saving is unchanged: the same `checkinForm` fields and the same "Save check-in" button and `saveCheckin`.

### 3.2 Recent weeks

- **Calendar:** a month grid (Monday first) showing the current month, with previous/next month buttons (back as far as the oldest check-in or 12 weeks, whichever is earlier; not past the current month). Each week row that has a check-in is marked with a warm lamp dot at its start and a thin four-colour bar (the four gauge scores). The current week is ringed in blue. Weeks without a check-in stay quiet (never red).
- **Trend:** an inline SVG line chart of the last 12 weeks, one line per gauge in its colour, y axis 1 to 10, week labels on x. Missed weeks leave a gap in the line. No chart library.
- **Detail:** tapping a week (in the calendar or a chart point) shows that week's four scores in their colours and the reflection sentence below the chart.
- Both come from the existing `checkins` and `historyWeeks` data; nothing new is loaded or saved.

### 3.3 Church health

The three metric columns as today (definitions verbatim from Henry), inside the expander.

## 4. Arena

- Before Month 1 (the Arena's start screen), a "How the Arena keeps score" block: one sentence ("Every choice you make moves three counters, the same three things Avenue watches in real life.") and the three counters with their plain meanings.
- Under each counter during play and at the end, a one-line meaning in `--muted`:

| Counter | Meaning line (Henry to check) |
|---|---|
| Pathways | People who feel they belong and invite others |
| Intersections | People who come to faith and are apprenticed |
| Streetlights | Disciples who step out to lead or serve |

## 5. Multiply

Order: phase opening, then the person list ("Who you're sending out") and the add form, then a one-line summary ("1 person multiplying through 1 generation below you" or "Nobody sent out yet"), then a "See the family tree" link, then a "Why multiply?" expander holding the Paul and Timothy teaching and the Hero Maker five practices. The "SENDING NOBODY YET" label and the family tree card are removed (their information survives in the summary line and the link).

## 5b. Leader Support and Workshop Hub move to Admin (Henry, 24 Sep)

- Remove "Leader Support" and "Workshop Hub" from the dashboard Tools list (`src/app/leaders/page.tsx`).
- Remove every other leader-facing link to them: the pending-access line keeps its sentence ("Your access opens after your first call with a pastor.") with no link, and Calling section 6 (`ConversationStep.tsx`) drops the "Book it through Leader Support" link (and the unused `supportLink` string in `calling/content.ts`).
- On the Admin page (`src/app/leaders/admin/page.tsx`), add a small link row at the top: "Leader Support" (`/leaders/support`) and "Workshop Hub" (`/leaders/workshops`), 44 px targets.
- The two pages themselves and their access rules are unchanged (no auth change).

## 6. Out of scope

- Any change to saving, auth, API calls, data shape, completion rules or the protected hooks (same list as the first spec's plan).
- New content beyond the intro and meaning lines above (each marked for Henry to check).
- Public site pages.

## 7. Testing and safety

- Pure logic has unit tests: the calendar month grid (weeks of a month, Monday first, which weeks have check-ins, month navigation bounds), the chart's point/gap mapping, the Growth summaries, the "text fits in two lines" rule is visual so is browser-checked.
- Every changed screen checked by the controller at 375 px and desktop; keyboard: sliders, expanders, avatar panel (Escape, focus return).
- `npx tsc --noEmit`, `npm test` (230 today, only goes up), lint at or below 54, `npm run build`, `npm run guard` clean, no em dashes.
- Built on `feat/avenue-night-2`, reviewed per task, nothing pushed until Henry says push.
