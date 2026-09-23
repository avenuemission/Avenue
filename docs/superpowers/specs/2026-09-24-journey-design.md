# Leader journey: Multiply, Growth, Calling, Launch, polish

**Date:** 2026-09-24
**Status:** Written by Claude overnight under Henry's "you have the wheel". Decisions Henry has not seen are marked **Ruling** and collected at the end so he can reverse any of them.
**Builds on:** `2026-09-23-foundations-design.md` (real login, `requireLeader`, `leaderFetch`, `leader_people`, `PersonPicker`).
**Brief:** `HANDOVER.md` section 3, plus the ranked recommendations in the 23 Sep summary artifact.

---

## 0. Locked decisions (Henry, not reopened)

| Decision | Source |
|---|---|
| One shared person record per leader (`leader_people`) across all features | Handover 4 |
| APEST quiz pulled into Calling as section 4; public page stays; questions and scoring extracted to a shared module | Handover 4 |
| Growth metrics are three independent lists, not a ladder | Handover 4 |
| Calling Profile and Launch Plan are private to the leader, printable | Handover 4 |
| ICNU notes are private to the leader | 23 Sep chat |
| Build order: Multiply, Growth, Calling, Launch | 23 Sep chat |
| Arena: no grade; ends with principles learned and where the plan is thinnest | Handover 3.2 |

## 1. Shared foundation

### 1.1 Worksheets table (migration 008)

Calling and Launch each store one private JSON document per leader, split into named sections.

```sql
create table if not exists public.leader_worksheets (
  email       text not null,
  kind        text not null check (kind in ('calling','launch')),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (email, kind)
);
alter table public.leader_worksheets enable row level security;

-- Atomic per-section write: two tabs editing different sections never clobber each other.
create or replace function public.worksheet_set_section(p_email text, p_kind text, p_section text, p_value jsonb)
returns jsonb language sql security definer set search_path = public as $$
  insert into public.leader_worksheets (email, kind, data, updated_at)
  values (p_email, p_kind, jsonb_build_object(p_section, p_value), now())
  on conflict (email, kind) do update
    set data = public.leader_worksheets.data || jsonb_build_object(p_section, p_value),
        updated_at = now()
  returning data;
$$;
revoke all on function public.worksheet_set_section(text, text, text, jsonb) from public, anon, authenticated;
```

**Ruling W1:** per-section merge instead of the training page's revision engine. A worksheet is one person typing; the only real race is two tabs, and section-level merge removes it without the complexity that took six review rounds.

### 1.2 `/api/worksheets`

| Method | Does | Guard |
|---|---|---|
| GET `?kind=calling\|launch` | `{ data, updatedAt }` for the caller, `{}` if none | `requireLeader`, filter by session email |
| PATCH `{ kind, section, value }` | Calls `worksheet_set_section` via `db.rpc`, returns merged `data` | `requireLeader`, email from session only |

Validation (pure, `src/lib/worksheets.ts`, unit-tested):
- `kind` in the two allowed values.
- `section` must be in the kind's whitelist:
  - calling: `layers`, `callable`, `shared`, `apest`, `seasonal`, `conversation`
  - launch: `prayer`, `mission`, `space`, `team`, `intentional`, `rhythm`, `invite`, `arena`, `actions`
- `value` is plain JSON (object, array, string, number, boolean, null), nesting depth at most 5, serialised size at most 20,000 characters.

### 1.3 Client hook

`useWorksheet(kind)` returns `{ data, loaded, error, saveSection(section, value), savingSection }`. It debounces a section's save by 600 ms, sends only that section, and replaces `data` with the server's merged result. A failed save keeps the local value and shows "Not saved yet, retrying when you next change it" rather than discarding typing.

### 1.4 Routes

| Route | Purpose |
|---|---|
| `/leaders/training` | Existing hub. Phase 2 and 3 cards become entry points with progress |
| `/leaders/training/calling` | Calling wizard |
| `/leaders/training/calling/profile` | Calling Profile, printable |
| `/leaders/training/launch` | Launch wizard |
| `/leaders/training/launch/plan` | Launch Plan, printable |

All gate like the training page: `getCurrentUser`, then `leaderFetch("/api/leader-access")`, redirect to `/leaders` without full access.

### 1.5 Wizard shell (shared by Calling and Launch)

Patterns taken from the reference planner (handover 3.2):
- Header: "STEP 3 OF 9" and a shrinking time estimate, "~30 MIN · ~18 LEFT", from per-step minutes.
- One step visible at a time, three or four inputs per step, never a wall of fields.
- Outcome-phrased buttons ("Sort the layers", "Save my yes", "Show my launch plan"). Never "Next".
- Resume: the wizard opens at the first incomplete step; a step list lets a leader jump anywhere.
- Every step saves as they go (1.3). No submit button that can lose work.
- Mobile first: single column, 44 px touch targets, no fixed widths.

A step counts as complete when its section has the fields that step marks as required.

### 1.6 Printable pages

A shared print stylesheet (`@media print` in `globals.css`): white background, black text, hide nav and buttons, keep panels as hairline boxes, avoid page breaks inside a panel. The page's button says "Print or save as PDF" and calls `window.print()`.

---

## 2. Multiply (phase 5): person-first

Replace the flat stepper with one row per person the leader has sent out (`sentByViewer`).

- **Collapsed row:** name, current rung label, five small rung dots.
- **Expanded row, in order:**
  1. **ICNU** ("What I see in you"): a textarea, private, saved to the `leader_people` row linked by `network_person_id`. If no linked row exists, the first save creates one (`firstName`, `lastName` from the network person, `networkPersonId`). Save on blur and after 800 ms idle, with a small "Saved" state.
  2. **The rung checklist:** the five apprenticeship steps as a vertical checklist. Tapping a rung sets `apprentice_step` to that rung (existing `set-apprentice-step` action); tapping the current top rung again steps back one.
- Keep the multiplication depth figure as one compact line above the list.
- Keep the link to the full network page.
- Empty state: "No one yet. Add the people you're apprenticing on your network page." with the link.
- Remove the Hero Maker "crash course notes coming soon" tiles. **Ruling M1:** hidden until Henry writes the notes; the practice names move into one short line of copy.

## 3. Growth (phase 4)

New order:
1. **This week:** the RPMS check-in form first (recommendation 1). History stays below it.
2. **Your three metrics:** three independent panels, Pathways, Intersections, Streetlights, each with Henry's definition (handover 3.3), a count, the named people as removable chips, and a `PersonPicker` with that metric tag. Removing a chip PATCHes the person's `metrics` without that tag. A person can sit in any combination.
3. History.
4. One muted line for what is coming: "Coming soon: healthy group check and prayer requests." **Ruling G1:** the two coming-soon cards and the four "crash course notes coming soon" tiles are removed until content exists.

## 4. Calling (phase 2): wizard plus Calling Profile

Content lives in `src/app/leaders/training/calling/content.ts`, drawn from Henry's podcast script (`C:\Users\User\Downloads\Scripts for Podcast on Calling.txt`), and is mirrored for editing in `docs/calling-content.md`.

Each section is: a video slot, then an interaction. **Ruling C1:** videos are not ready, so each section has `youtubeId: null`, which renders a "Video coming" panel with a 3 to 5 sentence summary in Henry's words from the script. Adding the video later is a one-line content change.

| # | Section | Interaction | Saves to |
|---|---|---|---|
| 1 | What is a Calling | Sort 9 statements into Shared (permanent), Specific (adaptive), Seasonal (changing). Tap a statement, tap a layer. Instant feedback per statement with the reason from the script. Complete when all 9 are placed | `layers` |
| 2 | A Life that is Callable | Private journal: four prompts (what is crowding out space, where a shadow mission pulls you one degree off, what you fear about being called, what would change if God called you). Then "Are you willing and available?" Yes / Not yet / Unsure. Complete when the question is answered | `callable` |
| 3 | The Shared Call | Scenario: a friend says life has been hard; choose between "invite them to our next event" and "invite them to dinner with us this week"; feedback quotes the script ("easier to invite people to a program..."). Then "Will you say yes to the Shared Call?" button saves `{ yes: true, date }` | `shared` |
| 4 | The Specific Call | The APEST quiz from the shared module (4.1). Result shows the leader's top two gifts, what each equips others to do, and the immature expression to watch for, all in Henry's words | `apest` |
| 5 | The Seasonal Call | Three-spaces people map: three columns (1st home, 2nd work, 3rd play) each with a `PersonPicker` tagging spaces on `leader_people`. "What people group do you have a heart for?" text. "If you planted a Pathway this season, which space would host it?" with the script's one-line pro for each. A RICE worksheet (Reason, Intuition, Counsel, Experience) for one decision they are weighing | `seasonal` (people live in `leader_people`) |
| 6 | Conversation | "Book your theology and character conversation with a pastor" (the existing p2m6 module): a checkbox plus an optional date. This is the seam for the parked coach checkpoint | `conversation` |

**Ruling C2:** the APEST quiz inside Calling does not call OpenAI. The personalised response on the public page costs money per run; inside Calling the result text comes from Henry's own script.

### 4.1 Shared APEST module

`src/lib/apest.ts` exports `APEST_ROLES`, `QUESTIONS`, `SCALE_OPTIONS`, `RoleKey`, `ApestResults`, and a pure `scoreApest(answers): ApestResults`. The public `/apest-quiz` page imports them with no behaviour change (still posts to OpenAI and Netlify Forms). Unit tests pin the scoring.

### 4.2 Calling Profile (`/leaders/training/calling/profile`)

Private and printable. Sections: my three layers (understanding score out of 9), my availability (their yes/not yet/unsure; journal answers shown only on screen behind a "Show my journal" toggle and **excluded from print by default**, Ruling C3), my yes to the Shared Call (date), my gifts (top two with the growth warning), my mission field (people count per space, the people group, the chosen hosting space, RICE notes), my conversation (booked or not). Empty sections say what to do next and link to that step.

### 4.3 Training hub integration

Phase 2's module grid is replaced by a Calling card: sections complete out of 6, "Continue Calling" (resumes), and "View my Calling Profile". **Ruling C4:** Calling progress replaces the phase 2 module ticks in the overall progress ring. Old p2 module ids stay in saved progress and are simply unused.

## 5. Launch (phase 3): wizard plus Launch Plan

No videos. Steps are the existing phase 3 modules (Nehemiah 1 and 2) grouped, not invented:

| # | Step | Modules | Inputs |
|---|---|---|---|
| 1 | Pray first | p3m2, p3m4 | When you will pray and fast about the launch; who prays with you; how often the launch team meets to pray |
| 2 | Your mission group | p3m5 | Who you are on mission for (prefilled from Calling's people group); what they need; where they already gather |
| 3 | Your space | p3m6 | The hosting space (prefilled from Calling's choice); the specific place; the script's pros and cons for 1st, 2nd and 3rd spaces, unpacked as promised in Calling section 5 |
| 4 | Your launch team | p3m3, p3m4 | Name 2 to 4 people via `PersonPicker` (stored as person ids in the section); a conditional STOP box when fewer than 2: "You have no launch team yet. Nehemiah took a few people with him before he told anyone. Name at least two." |
| 5 | Live intentionally | p3m7, p3m8 | Two or three concrete commitments; where you are putting yourself in a position of need |
| 6 | Rhythm and launch date | p3m9, p3m12 | Launch date; weekly night and time; live tiles: weeks until launch, gatherings in the first six months |
| 7 | Invite and care | p3m13, p3m14, p3m15 | Invite list via `PersonPicker` with the invitee tag; how you will keep track of birthdays and needs; who shepherds whom |
| 8 | The Arena | | See 5.1 |
| 9 | Your Launch Plan | | Opens 5.2 |

Cross-step reuse: steps 2 and 3 quote the leader's own Calling answers. If Calling is not done, they show "You haven't finished Calling yet" with a link, and still work.

### 5.1 The Arena

A six-month rehearsal that reads the leader's own plan and presses on its gaps (handover 3.2). Engine in `src/lib/arena.ts`: pure, deterministic, unit-tested.
- Input: the plan (steps 1 to 7) and the chosen answers.
- Gap detection: no launch team or fewer than 2, hosting in a 1st space home, no mission group, no rhythm set, no apprentice named (no one in the leader's network with `apprentice_step` at least 1).
- Default months: curveballs 1, 2, 4, 5, 8, 7; each shows the situation, a "bites harder because" line when a relevant gap exists, and four choices.
- Picking a choice shows the verdict, the counter movement, the named principle and its anchor.
- Counters: Pathways, Intersections, Streetlights, starting at 0, never below 0.
- Ending: no grade. The principles earned, in order, and the thinnest parts of the plan with what to do.
- The result (choices, principles, gaps) saves to the `arena` section and carries into the Launch Plan.

Content comes from `docs/launch-arena-content.md`, transcribed into `src/app/leaders/training/launch/arenaContent.ts`.

**Ruling L1:** Henry has not signed off the Arena content (handover: "do not build the Arena content until he has been through it"). The engine and screens are built and tested, but the step is behind `ARENA_ENABLED = false` in `arenaContent.ts`. With the flag off, step 8 shows "The Arena: a six-month rehearsal of your plan, coming soon" and the wizard skips straight to the plan. Henry can turn it on locally to review the draft in the real screens before signing off.

### 5.2 Launch Plan (`/leaders/training/launch/plan`)

Private, printable one-pager: why and prayer rhythm, mission group, space, launch team (names), commitments, rhythm and date with the computed tiles, invite list count, shepherding plan, and (when the Arena is on and played) principles learned. Ends with **"Where your plan is thin"**: the same gap rules as the Arena, each with one plain next action, and **next actions as tickable checkboxes** that quote the leader's own words (saved to the `actions` section). No readiness score (Ruling L2: consistent with "no grade").

### 5.3 Training hub integration

Phase 3's module grid is replaced by a Launch card: steps complete out of 7, "Continue Launch", "View my Launch Plan". Overall progress counts Launch steps like Calling (Ruling C4).

---

## 6. Polish (from the 23 Sep recommendations)

| # | Change | Where |
|---|---|---|
| P1 | Training on phones: below `md`, replace the orbit with a compact horizontal step list; the orbit stays on desktop | `training/page.tsx` |
| P2 | Remove the duplicated expanded phase detail card under the orbit; the phase header carries title, scripture and progress once | `training/page.tsx` |
| P3 | Dead Play button: video modules with no episodes and no video render no Play button | `PhaseModules.tsx` |
| P4 | Design tidy: phases 4 and 5 use the accent instead of purple; progress rings use `var(--accent)`; no `backdrop-blur` on the video modal | `training/page.tsx` |
| P5 | Honest intro copy: "Work through each phase with your coach." instead of "unlock the next" | `training/page.tsx` |
| P6 | Pending access: locked dashboard cards explain "Your access opens after your first call with a pastor" and link to Leader Support | `leaders/page.tsx` |
| P7 | Site nav shows "Leaders" instead of "Login" when a leader is signed in | the site navbar |
| P8 | Dashboard "Your next step" card: the first unfinished thing among Foundations modules, Calling, Launch, and this week's check-in, with one button | `leaders/page.tsx` |

**Ruling P0:** the Admin tile stays visible to all leaders; hiding it needs a real admin role, which is out of scope.

## 7. Testing and safety

- Pure modules (`worksheets.ts`, `apest.ts`, `arena.ts`, Launch gap rules, Calling completion rules) carry Vitest unit tests.
- `scripts/check-auth.mjs` gains a worksheets block: no token 401, non-leader 403, body email ignored, A cannot read B's worksheet, invalid section 400, oversized value 400. Guarded by a table-exists SKIP like the people block.
- Every task: `npx tsc --noEmit`, `npm test`, lint within the 55 to 56 band, `npm run guard` clean.
- Browser check of each new screen at 375 px and desktop by the controller.
- Migration 008 is applied by the controller in Henry's Chrome; if the safety check blocks it, the worksheet features are verified with unit tests and the SKIP guard, and the migration is left for Henry.
- Nothing is pushed. Henry says "push".

## 8. Rulings made overnight (for Henry to reverse)

W1 per-section merge; M1 hide Hero Maker placeholder tiles; G1 hide coming-soon cards and RPMS placeholder tiles; C1 video placeholders with script summaries; C2 no OpenAI in Calling's APEST; C3 journal excluded from print by default; C4 Calling and Launch progress replace phase 2 and 3 module ticks; L1 Arena behind a flag until content sign-off; L2 no readiness score; P0 Admin tile stays.
