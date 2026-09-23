# Avenue at night: Leadership Journey redesign

**Date:** 2026-09-24
**Status:** Approved in chat by Henry, awaiting review of this written spec
**Mockup:** https://claude.ai/artifact/68jqrVdTcwnkW4vfv4Ra3m (map A, phase opening, moment, phone view)

---

## Why

The leader side dropped the public site's identity (earth at night, starry skies, big type, street language: Pathways, Intersection, Streetlights) and fell back to a generic dark dashboard: the same grey rounded card everywhere, uppercase mono labels, percentage rings and an abstract orbit diagram. Henry: "not very interesting, dynamic, visually appealing and does look a bit AI."

## Decisions (Henry, 24 Sep)

| Question | Decision |
|---|---|
| Direction | Avenue at night: the journey is a street with five stops, a streetlight lights as each phase is walked |
| Map | A, the avenue seen from the side with lamp posts in a row |
| Photos | None. Type, night sky and illustration only |
| Colour | Blue (`#4f7cff`) stays the one accent and means "you are here". Warm streetlight (`#ffc56b`) means walked or done. Glow is allowed only on light (lamps, lit steps), never as decoration |
| Motion | Moments only. Still pages; animation reserved for milestones |
| Scope | Journey hub, Calling and Launch wizards (including the Arena, Calling Profile, Launch Plan), leader dashboard, login page |
| Type | A classic serif, Newsreader, for phase titles, big questions and scripture; Geist for everything else |
| Phase opening | As mocked: "Stop N of 5 · reference", serif phase name, the verse as the headline, lamps for steps |
| Translation | NLT |

## 1. Tokens

Added to `globals.css` and used by every journey screen:

| Token | Value | Use |
|---|---|---|
| `--night` | `#05070c` | Page ground on journey screens |
| `--night-2` | `#0a0e16` | Raised surfaces (cards that take input) |
| `--line` / `--line-2` | `#1b2230` / `#263042` | Hairlines |
| `--muted` / `--dim` | `#8b94a7` / `#566074` | Secondary text / things ahead |
| `--accent` | `#4f7cff` | You are here, primary buttons, focus |
| `--lamp` / `--lamp-2` | `#ffc56b` / `#ffdca0` | Walked, done, lit |
| `--serif` | Newsreader via `next/font/google` (opsz, 400/500, italic) with Georgia fallback | Titles, questions, verses |

The design-system rule in the handover changes from "no glow" to "glow only on light". No gradients anywhere except the light itself (lamp halos and the pool of light under a lit lamp).

## 2. Components (new, in `src/components/avenue/`)

| Component | Does | Props |
|---|---|---|
| `AvenueMap` | Map A as an inline SVG: night sky with a few stars, the street with a dashed centre line, five lamp posts. Walked stops are lit (warm lamp, halo, cone of light), the current stop has a blue lamp outline and a blue "you are here" dot, stops ahead are dim. Labels in serif under each lamp, status in small mono. Each stop is a real link/button that opens that phase. Below `md` it renders the vertical street (see 2.1) | `stops: { id, name, status: "walked" \| "here" \| "ahead" }[]`, `onSelect(id)`, `selectedId` |
| `AvenueStreet` | The vertical phone street: a line down the left, lit in warm light up to the current stop, a dot per stop, serif stop names, and the current stop open in place with its one next action | same as `AvenueMap` plus `hereAction: { text, href }` |
| `PhaseOpening` | "Stop N of 5 · reference" with a small lit bulb, the phase name in large serif, the verse in serif italic with the reference in mono, optional children (lamp steps) | `stop`, `name`, `reference`, `verse?` |
| `LampSteps` | A row of small lamps with labels, one per wizard step; lit when complete, blue ring on the current one; wraps on phones; each lamp is a button that jumps to its step | `steps: { id, label, status }[]`, `onSelect(index)` |
| `Moment` | The milestone: a lamp post that ignites (bulb fills warm, halo scales in over about 1.4 s, a soft pool of light behind), a serif line and a small caption. Respects `prefers-reduced-motion` (shows the lit state instantly). Announced with `aria-live="polite"` | `title`, `caption`, `play` (boolean trigger) |
| `Glow` | The gentle version for small actions: a 600 ms warm pulse on the element that changed | wraps children, `trigger` key |

Rules for all of them: no emoji, no uppercase mono except the small status labels, 44 px touch targets, keyboard focus ring in lamp colour, text colours from tokens only.

### 2.1 Phase status

A stop is **walked** when: Foundations, all phase 1 modules ticked; Calling, all six sections complete; Launch, all seven steps complete; Growth and Multiply are ongoing rhythms, so they are **walked** once the leader has at least one check-in (Growth) or at least one person at rung 1 or above (Multiply). The first stop that is not walked is **here**; the rest are **ahead**. Pure function `avenueStops(progress)` in `src/lib/avenue.ts` with unit tests. Leaders can open any stop regardless of status (nothing is locked, matching today).

## 3. Where the moments happen

Full `Moment` (milestones only):
- A phase becomes walked: played at the instant it happens, where it happens (ticking the last Foundations module, finishing the last Calling section or Launch step, the first Growth check-in, the first apprentice reaching rung 1). No stored "seen" flag is needed, so nothing new is saved.
- Yes to the Shared Call (Calling section 3).
- Booking the pastor conversation (Calling section 6).
- Setting a launch date (Launch step 6).

Gentle `Glow` (small actions): naming someone under a Growth metric, moving an apprentice up a rung, completing any wizard step (its lamp lights).

## 4. Screens

### 4.1 Journey hub (`/leaders/training`)
- Opens with a short serif greeting ("Good evening, Sam." by Melbourne time of day) and one line of status ("Two streetlights on. Launch is next.").
- `AvenueMap` replaces the orbit and the phone step list. Selecting a stop shows that phase below.
- Each phase section starts with `PhaseOpening`. Then its content sits directly on the night ground: Foundations modules as a clean list with the episode carousels; Calling and Launch as a single "continue" block with `LampSteps` and the two links (wizard, profile or plan); Growth with the check-in first, then the three metrics as three columns of names (no card per metric), then history; Multiply as the person list with lamp-dot rungs.
- The sticky pill header and the "Back to dashboard" link stay but restyled quieter.

### 4.2 Calling and Launch wizards
- `PhaseOpening` at the top (smaller variant), then `LampSteps` instead of "STEP 4 OF 9" and the bar. The time estimate stays as one quiet line.
- Each step's question in serif; inputs in `--night-2` cards; outcome buttons as today.
- The Arena: months as a dim-to-lit street of six small lamps across the top; the three counters as warm numerals; the ending as a lit street with the principles listed beneath each lamp.
- Moments at the three yeses above.

### 4.3 Calling Profile and Launch Plan
- On screen: `PhaseOpening` style header, sections as serif headings on the night ground.
- Print: unchanged (black on white).

### 4.4 Leader dashboard (`/leaders`)
- Serif greeting, a compact `AvenueMap` (or `AvenueStreet` on phones) showing where they are, then the next-step card as the one lit card on the page, then the profile and tools restyled quieter (hairline list instead of a grid of boxes).

### 4.5 Login (`/login`)
- The night street behind the form: sky, a few stars, one lit streetlight to the side; the form on `--night-2`. Serif heading "Leader login".

## 5. Scripture

`src/app/leaders/training/verses.ts` holds one passage per phase (NLT):

| Phase | Passage |
|---|---|
| Foundations | Acts 2:42 |
| Calling | Ephesians 4:11-12 |
| Launch | Nehemiah 2:17-18 |
| Growth | Exodus 18:17-18 |
| Multiply | 2 Timothy 2:2 |

Henry pastes the exact NLT wording (and may swap passages). Until a verse's text is present, `PhaseOpening` shows the reference only as the headline, never guessed text. Each quote ends "(NLT)", and the journey footer carries the NLT copyright notice required for web use.

## 6. Out of scope
- The public site, admin pages, network page (except that they keep working with the new tokens).
- New features or content changes; this is presentation only. All saving, auth and data logic stays as is.

## 7. Testing and safety
- Pure logic (`avenueStops`, time-of-day greeting, moment-once rules) has unit tests.
- Every changed screen is checked by the controller at 375 px and desktop, with reduced motion on and off.
- `npx tsc --noEmit`, `npm test`, lint within the band, `npm run build`, `npm run guard` clean.
- Built on a branch, reviewed per task, nothing pushed until Henry says push.
