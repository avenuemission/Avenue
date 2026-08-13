# Discipleship Network + leader dashboard restructure

**Date:** 2026-08-13
**Status:** Approved design, not yet implemented
**Scope:** Stage 1 (leader-facing). Stage 2 (admin tab) is specified here but built after Stage 1 lands.

---

## 1. Why

The leader dashboard at `/leaders` currently leads with a large My Profile card, one
Training card, five More Tools tiles and a Quick Links panel. Henry wants the page to
lead with action, not with his own profile, and wants a new feature: a **Discipleship
Network** showing who sent out whom, so leaders can watch multiplication happen and
admins can see every network at once as a snowflake growing outwards.

There are currently **2 leader accounts** in Supabase (`info@avenuemission.com`,
`henry.jamcmahon@gmail.com`) and 1 stale test row in `leader_profiles`
(`claude-profile-test@example.com`). The network therefore starts effectively empty,
which is why people without accounts must be representable.

---

## 2. Decisions locked

| Question | Decision |
|---|---|
| Relationship shape | One person sent you out. Single parent, so the graph is a forest of trees |
| Creating a link | The sender adds the person, the person confirms |
| People without accounts | Allowed. Added by name, shown faded, auto-claimed when they sign up |
| Visibility | Every logged-in leader sees the whole network |
| Node contents | Photo and first name only |
| Wording | "Sent out by" (upward) and "Sending out" (downward) |
| Breaking a link | Either person can, and an admin can re-parent anyone |
| Default view | Whole network zoomed to fit, viewer's own node highlighted |
| Third dashboard button | Weekly Pathways Topics, promoted out of More Tools |
| Collapsed profile | Avatar circle on a slim row, expands the full card in place |
| Staging | Leader view first, admin tab second |

---

## 3. Data model

### 3.1 New table

```sql
-- supabase/migrations/003_network_people.sql

create table if not exists public.network_people (
  id             uuid primary key default gen_random_uuid(),
  email          text unique,                       -- nullable, stored lowercase
  first_name     text not null,
  last_name      text,
  sent_out_by    uuid references public.network_people(id) on delete set null,
  link_status    text not null default 'pending'
                 check (link_status in ('pending', 'confirmed')),
  added_by_email text,                              -- audit: who created this node
  joined         boolean not null default false,    -- true once a leaders row exists
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint network_people_no_self_parent check (sent_out_by is null or sent_out_by <> id)
);

create index if not exists network_people_sent_out_by_idx
  on public.network_people (sent_out_by);

alter table public.network_people enable row level security;

-- Deliberately no policies. Every read and write goes through the service-role
-- client in /api/network, matching leaders, form_submissions and leader_profiles.
```

### 3.2 Why the parent lives on the node

The relationship is single-parent, so the edge and the child node are one-to-one. A
separate `links` table would add a join for no gain. `link_status` describes the edge
between this row and its `sent_out_by` row, which is unambiguous because there is only
ever one such edge.

### 3.3 Invariants the API enforces

| Invariant | Enforcement |
|---|---|
| No self-parent | DB check constraint, plus an API guard |
| No cycles | Before saving `sent_out_by`, walk the parent chain server-side. Reject if the walk reaches the node being edited |
| Depth cap | The same walk aborts at 50 hops and returns an error, so a corrupted chain cannot hang a request |
| Email casing | API lowercases and trims every email before read or write. The unique index then does the rest |
| One node per email | `email` is unique. Adding someone whose email already exists links the existing node instead of creating a duplicate |

### 3.4 Relationship to existing tables

- **`leaders`** (`id, email, name, full_access, created_at`) stays the account record.
  Nothing about accounts moves into `network_people`.
- **`leader_profiles`** (email primary key) stays the source of avatars. The network API
  joins on email to fetch `avatar_url` and `display_name`. Avatars are not duplicated.
- A `network_people` row with `email = null` has no account and no profile. It renders
  with initials, faded.

---

## 4. API

New route: `src/app/api/network/route.ts`. Uses `getSupabaseAdmin()` and the existing
`adminConfigError()` guard so a missing service-role key fails loudly rather than
silently writing zero rows.

### 4.1 GET /api/network?email=<viewer>

Returns the whole graph. The viewer email must exist in `leaders`, otherwise 403.

```jsonc
{
  "people": [
    {
      "id": "uuid",
      "firstName": "Aaron",
      "lastName": "S",
      "email": "aaron@example.com",   // omitted when null
      "avatarUrl": "data:image/...",  // from leader_profiles, null if none
      "sentOutBy": "uuid | null",
      "linkStatus": "pending | confirmed",
      "joined": true
    }
  ],
  "viewerId": "uuid | null"           // the viewer's own node, if they have one
}
```

Last names are returned but only rendered in the node detail popover, not on the chart.

### 4.2 POST /api/network

Body is `{ action, actorEmail, ... }`. Admin-only actions instead require
`Authorization: Bearer <ADMIN_API_KEY>`, matching
`src/app/api/leader-access/admin/route.ts`.

| Action | Body | Behaviour |
|---|---|---|
| `add` | `firstName`, `lastName?`, `email?` | Creates a node whose `sent_out_by` is the actor's node, `link_status = 'pending'`. If `email` already exists as a node with no parent, that node is adopted instead of creating a duplicate, and the cycle walk runs first because adopting an ancestor would close a loop. If it exists **with** a parent, returns 409 with the existing sender's first name |
| `confirm` | `id` | Only the actor's own node. Sets `link_status = 'confirmed'` |
| `decline` | `id` | Only the actor's own node. Clears `sent_out_by` and resets status to `pending` |
| `remove` | `id` | Allowed if the actor is that node **or** that node's parent. Clears `sent_out_by` |
| `reparent` | `id`, `newParentId \| null` | Admin key only. Runs the cycle walk before saving |

Every write sets `updated_at = now()` in the API, matching the `leader_profiles`
convention of no DB triggers.

### 4.3 Claiming a node at signup

When a `leaders` row is created (existing signup path in
`src/app/api/leader-access/route.ts`), the API also upserts into `network_people`:

- If a node with that email exists, set `joined = true` and fill `first_name` if blank.
- Otherwise insert a new node with `joined = true`, `sent_out_by = null`.

This is the only change to existing API code in Stage 1.

The two accounts that already exist predate this table, so they have no node. Every
`/api/network` request therefore lazily ensures the caller has one: if the actor's email
is in `leaders` but not in `network_people`, the API inserts a root node for them before
doing anything else. No manual backfill is needed.

---

## 5. Confirmation flow

| Situation | What the person sees |
|---|---|
| Added with no email | Nothing. The node sits faded and stays `pending` indefinitely |
| Added with an email, no account yet | Nothing until they sign up |
| Added, then signs up | On next visit to `/leaders`, a panel above the buttons: "Henry says he sent you out." with **Confirm** and **Not right** |
| Already has an account when added | The same panel on their next dashboard visit |
| Confirmed | Panel disappears. Their edge renders as a solid line |

The banner is a `.panel` block on the dashboard, not a modal. It only appears when the
viewer's own node has `sent_out_by` set and `link_status = 'pending'`.

**Accepted consequence:** a node with no email can never confirm, so it stays faded
permanently. This is intentional and useful: faded means "named by someone but not on
the platform", which is exactly the invite list.

---

## 6. The chart

### 6.1 One component, two pages

`src/components/ui/NetworkGraph.tsx` renders the radial snowflake and is used by both
the leader page and, in Stage 2, the admin tab. The admin tab passes extra props to
enable re-parenting. Building one component instead of two roughly halves the code and
guarantees the two views cannot drift apart.

### 6.2 Layout

Hand-rolled radial layout in `src/lib/networkLayout.ts`. No new dependency: `d3` is not
currently installed and this is about sixty lines of angle maths.

1. Collect roots (`sent_out_by = null`). Multiple roots are expected.
2. Attach all roots to a virtual centre node so the whole forest draws as one snowflake.
3. Count leaves per subtree. Give each child an angular slice proportional to its leaf
   count, so dense branches get room and sparse ones do not waste it.
4. Radius is a fixed step per depth level.
5. Convert polar to cartesian, return `{ nodes, edges, bounds }`.

The function is pure: nodes in, coordinates out. It gets unit tests for the invariants
that matter (single root, multiple roots, deep chain, cycle input rejected).

### 6.3 Rendering

- Inline SVG, sized to its container, `viewBox` set from the returned bounds so the
  whole network fits on load.
- Node: a circle with the avatar via `<image>` and a `<clipPath>`, or initials on
  `var(--surface)` when there is no photo. First name below.
- The viewer's own node gets a 2px `var(--accent)` ring.
- Not-joined nodes render at 55% opacity with a dashed edge.
- Edges are thin `var(--border)` curves. Confirmed is solid, pending is dashed.
- Pan by dragging the SVG, zoom by wheel and by explicit `+` / `-` / `Reset` buttons in
  the corner. Buttons matter because the wheel is awkward on trackpads and absent on
  touch.
- Clicking a node opens a popover showing only what the GET response carries: full name,
  who sent them out, whether they have joined, and, when the viewer is that node or its
  parent, a **Remove link** action. No pathway group, role or birthday. Those stay on the
  profile card, where the person chose to put them.

### 6.4 Design system compliance

Solid `.panel` surfaces, hairline `var(--border)`, single accent `#4f7cff`, `.eyebrow`
section labels, Geist. No glassmorphism, no gradients, no glow. The graph background is
`var(--bg)`, not a gradient.

### 6.5 Verification limits

Per `HANDOVER.md`, the in-app Browser pane freezes scrolling and CSS animation and
sometimes reports viewport width 0. Pan and zoom feel therefore cannot be verified
there. Plan: `resize_window` first, then assert node counts, coordinates, ring on the
correct node, opacity of un-joined nodes, and edge dash state via the DOM. Henry
eyeballs the motion.

---

## 7. Dashboard restructure (`src/app/leaders/page.tsx`)

Order of the page, top to bottom:

| Block | Change |
|---|---|
| Header | Unchanged |
| Page title | Unchanged |
| Confirmation banner | New, conditional. Only when the viewer has a pending `sent_out_by` |
| My Profile | Collapsed by default to a slim row holding just the avatar circle. Click toggles the full card open in place |
| Three main buttons | Training, Discipleship Network, Weekly Pathways Topics. `grid-cols-1 md:grid-cols-3` |
| More Tools | Now 4 tiles: Leader Support, Resources, Workshop Hub, Admin |
| Quick Links | Now a toggle button under More Tools. Expands the three pills in place |

### 7.1 ProfileCard change

`src/components/ui/ProfileCard.tsx` gains a `collapsible` prop, default `false`, so
nothing else that uses it changes. When `collapsible` is true it renders the slim row
and manages one boolean of open state. The card body is unchanged, only its wrapper.
The collapsed state does not persist between visits in Stage 1.

### 7.2 Access gating

Discipleship Network is **not** in `restrictedCards`. A leader awaiting authorization
can still see the network and add people. Training, Weekly Pathways Topics and
Resources keep their existing `full_access` gate.

---

## 8. Stage 2: admin tab

A `network` tab in `src/app/leaders/admin/page.tsx`, alongside submissions, leaders,
pathways, events, guides and stats.

- The same `NetworkGraph`, no viewer highlight, re-parent enabled.
- A flat table of every person: name, email, sent out by, status, joined.
- Re-parent control: pick a person, pick a new sender, or detach to root.
- Counters: total people, joined vs named-only, confirmed vs pending links, number of
  roots, deepest chain, widest branch.

Built after Stage 1 is in the tree and there are real links to look at.

---

## 9. Out of scope

- Fixing the plaintext-localStorage login. Flagged again below, deliberately not bundled.
- Rotating the exposed secrets.
- Any change to the public site.
- Notifications or email when someone adds you. The dashboard banner is the only signal.
- Multiple senders per person, or history of past senders.
- Cleaning up the stale `claude-profile-test@example.com` row. One line, but it is not
  this feature's job and should not ride along silently.

---

## 10. Risks

| Risk | Note |
|---|---|
| Login is not real auth | Passwords sit in plaintext in `localStorage` and the session is a single key. Anyone can impersonate any leader from devtools. This feature makes the whole network, including names of people who have not joined, readable to anyone who can fake a session. Henry has chosen "private now, secure later" before, and this raises the stakes of that choice |
| Names of non-members | People added by name have not consented to appearing. Only first names render on the chart, which limits it, but it is worth a word to leaders before inviting them to add people |
| False claims | Add-then-confirm stops a claim from showing as confirmed, but a pending claim still renders on everyone's chart until declined |
| Empty state | With 2 accounts the chart will look bare at first. The page needs a real empty state, not a blank SVG |

---

## 11. Files

**New**

```
C:\Users\User\CascadeProjects\Avenue\supabase\migrations\003_network_people.sql
C:\Users\User\CascadeProjects\Avenue\src\app\api\network\route.ts
C:\Users\User\CascadeProjects\Avenue\src\app\leaders\network\page.tsx
C:\Users\User\CascadeProjects\Avenue\src\components\ui\NetworkGraph.tsx
C:\Users\User\CascadeProjects\Avenue\src\lib\networkLayout.ts
```

**Changed**

```
C:\Users\User\CascadeProjects\Avenue\src\app\leaders\page.tsx
C:\Users\User\CascadeProjects\Avenue\src\components\ui\ProfileCard.tsx
C:\Users\User\CascadeProjects\Avenue\src\app\api\leader-access\route.ts
```

The migration must be run in the Supabase SQL editor for project `omepkrdyuymnqopaznid`
before the feature works. Henry runs it, the same way `leader_profiles` was created.

---

## 12. Deployment

Nothing is pushed. All work stays local and joins the existing batch of three
uncommitted features (video carousels, upcoming weeks, My Profile) so it all goes out in
one Netlify deploy when Henry says push.
