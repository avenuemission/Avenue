# Growth and Multiplication as ongoing rhythms

**Date:** 2026-08-27
**Status:** Draft for approval
**Repo:** `C:\Users\User\CascadeProjects\Avenue`

---

## 1. Why

Phases 1 to 3 are a journey you finish. Phases 4 and 5 are not, and pretending they are
is why they currently sit empty. After Launch, a leader is doing two things for the rest
of their life: staying healthy, and multiplying. Those run in parallel and never
complete.

The shape comes from two Dave Ferguson books:

- **Multiplier** supplies phase 4. Its argument is that you reproduce who you are, not
  what you teach, so health comes first. Its internal gauges are RPMS: Relational,
  Physical, Mental, Spiritual.
- **Hero Maker** supplies phase 5. Its most usable idea is that apprenticeship is a
  five-step progression you run with a named person, not a course you complete.

Avenue's own emphasis adds a second axis to phase 4: it is not enough for the leader to
be healthy, the pathway group has to be healthy too.

---

## 2. Decisions locked

| Question | Decision |
|---|---|
| Crash course notes | Placeholders for now. Layout and structure built, words come later |
| Weekly RPMS check-in | A score per dimension plus one reflection box |
| Phases 4 and 5 | Both open together once Launch is done, and neither shows a completion percentage |
| The five-phase bar | Stays. The journey remains recognisable |
| Group check-in | Coming soon placeholder |
| Prayer requests | Coming soon placeholder |
| RPMS visibility | Stored against the leader only for now. Sharing with whoever sent them out is deliberately deferred |
| Sequencing | This work starts now. The Calling checkpoint and admin release tab are parked |

---

## 3. Phase 4: Growth

Three blocks, in this order.

### 3.1 Healthy leader

**A recommendation, not a module.** A short card recommending Multiplier by Dave
Ferguson, with the RPMS gauges named. Then a crash course notes area, placeholder for
now, laid out so notes on each of the four gauges can drop in.

**The weekly check-in.** Four scores, one to ten, for Relational, Physical, Mental and
Spiritual, plus one reflection box. One check-in per week. Re-opening the current week
edits it rather than creating a second.

**The history.** A calendar-style strip of recent weeks. Each week shows as a small
block, coloured by its average, so a leader can see a run of green or a slide over a
month at a glance. Clicking a week opens what they wrote.

This is the part that has to feel worth returning to. A number they can watch move is
the point, not the form.

### 3.2 Healthy group

The Jeremy metric, a monthly diagnostic on how the pathway group is going, taken at or
before the pathway huddle.

**Coming soon.** A card that states what it will be and when it runs, with the monthly
rhythm visible so the leader knows it is part of the pattern. No form yet.

### 3.3 Prayer requests

**Coming soon.** A card describing the intent: requests a leader can raise and, later,
share with other leaders. No storage yet.

---

## 4. Phase 5: Multiplication

### 4.1 Crash course

Hero Maker, placeholder, laid out for its five practices and specifically for what they
look like in a daily rhythm rather than as theory.

### 4.2 Your people

The core of the phase, and the part that makes it worth opening.

Every person this leader is sending out, drawn from the existing discipleship network,
each with the apprenticeship step they are currently on:

1. I do, you watch
2. I do, you help
3. You do, I help
4. You do, I watch
5. You do, someone else watches

The leader advances a person a step when it is true. That single control is the whole
book made operable, and it turns a static list of names into something with movement.

### 4.3 Multiplication depth

One number, computed from the network that already exists: how many generations descend
from this leader, and how many people in total.

This is Ferguson's Kingdom Building measure, which asks leaders to count kingdom advance
rather than attendance. It costs nothing to compute and it is the most satisfying thing
on the page.

### 4.4 The family tree

A direct link into the existing Discipleship Network, centred on this leader.

### 4.5 An ICNU nudge

A prompt card carrying Ferguson's Permission Giving tool: name one person and what you
see in them. For v1 this is a prompt with a link to add someone to the network. Logging
ICNU conversations properly is a later idea, not this one.

---

## 5. Data model

### 5.1 New table for check-ins

```sql
-- supabase/migrations/006_leader_checkins.sql

create table if not exists public.leader_checkins (
  email       text not null,

  -- The Monday of the week being reflected on. One check-in per leader per week,
  -- so re-opening the current week edits it rather than stacking duplicates.
  week_start  date not null,

  relational  smallint not null check (relational between 1 and 10),
  physical    smallint not null check (physical   between 1 and 10),
  mental      smallint not null check (mental     between 1 and 10),
  spiritual   smallint not null check (spiritual  between 1 and 10),
  reflection  text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (email, week_start)
);

alter table public.leader_checkins enable row level security;

-- No policies. All access through the service-role route, matching every other
-- table in this project.
```

### 5.2 Apprenticeship step on the existing network

```sql
alter table public.network_people
  add column if not exists apprentice_step smallint not null default 0
    check (apprentice_step between 0 and 5);
```

Zero means not started. One to five are Hero Maker's steps. It belongs on
`network_people` because it describes the sending relationship, which is exactly what
that row already is.

### 5.3 Nothing yet for group check-ins or prayer

Both are coming soon cards. No table until the shape is real. A placeholder table would
be a guess that later needs a migration to correct.

---

## 6. API

New route `src/app/api/leader-checkins/route.ts`, same pattern as everything else:
service-role client, `adminConfigError()` guard, and the leaders check first and
unconditionally before any other query.

| Endpoint | Behaviour |
|---|---|
| `GET ?email=` | Recent check-ins, newest first, capped at 52 weeks |
| `PUT` | Upsert one week's check-in on `(email, week_start)`. Scores validated 1 to 10, reflection length capped |

The apprenticeship step is a small addition to the existing `/api/network` POST, as a
`set-apprentice-step` action, guarded so a leader can only set it on someone they are
themselves sending out.

---

## 7. What phases 4 and 5 must not become

- Not a checklist. Neither phase shows modules complete or a percentage.
- Not a form nobody fills in. The weekly check-in is four taps and one sentence.
- Not a second place where progress lives. The apprenticeship step goes on the network
  row, so the family tree and phase 5 are the same data seen twice.

---

## 8. Risks

| Risk | Note |
|---|---|
| Login is not real auth | Weekly reflections are personal, and anyone who knows a leader email could read or write them through the API. This is the most personal data the site has held so far, more so than birthdays |
| Placeholder fatigue | Three coming soon cards across two phases risks the phases feeling empty. The RPMS check-in and the apprenticeship steps must carry real weight from day one |
| Weekly cadence is a commitment | A check-in that is missed for a month makes the history look like failure. The history should show gaps neutrally, not as red |
| Sharing deferred | The brief says the person who sent you out should eventually see the check-ins. Building the table keyed by email keeps that cheap later, but the UI makes no promise about it now |

---

## 9. Out of scope

- Sharing check-ins with whoever sent the leader out.
- The group health survey itself.
- Prayer request storage or sharing.
- The Calling checkpoint and admin release tab, parked deliberately.
- Any change to the plaintext login.

---

## 10. Open question

The **Jeremy metric** is not yet defined. The coming soon card will describe a monthly
group health check taken at or before the pathway huddle, without claiming what it
measures, until that is known.
