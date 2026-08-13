# Discipleship Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Avenue leaders a "sent out by" network they can add people to and watch grow, and restructure the leader dashboard around it.

**Architecture:** A single `network_people` table holds one node per person with a single `sent_out_by` parent, so the graph is a forest of trees. All access goes through one service-role API route at `/api/network`. Layout maths lives in a pure, unit-tested module and one `NetworkGraph` SVG component renders the radial snowflake for both the leader page and, later, the admin tab.

**Tech Stack:** Next.js 16 (app router), React 19, TypeScript, Tailwind v4, Supabase (service-role client), lucide-react icons, Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-13-discipleship-network-design.md`

## Global Constraints

- **Never run `git push`.** Commit locally only. Henry pushes when he says push. Every push auto-deploys via Netlify and the plan has few deploys per month.
- **Never use em dashes** anywhere: code, comments, UI copy, commit messages. Use a colon, a comma, or a new sentence.
- **All database writes use `getSupabaseAdmin()`** from `src/lib/supabaseAdmin.ts`. Every table has RLS on with only public SELECT policies, so anon-key writes silently affect zero rows. Guard every handler with `adminConfigError()`.
- **Design system:** solid `.panel` surfaces, hairline `var(--border)`, single accent `var(--accent)` (`#4f7cff`), `.eyebrow` section labels, Geist font. No glassmorphism, no gradients, no glow blobs.
- **Wording:** "Sent out by" for the upward link, "Sending out" for the downward one. Never "discipled by".
- **Chart nodes show photo and first name only.** No pathway group, role or birthday on the chart.
- **Emails are trimmed and lowercased** on every read and write.
- Commits are authored as `Henry <henry.jamcmahon@gmail.com>` (already the git default here). Netlify's free plan allows one Git contributor. End every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, matching existing history.
- Dev server: `npm run dev` on port 3000. One is likely already running. Check with `netstat -ano | grep :3000` before starting another.
- The in-app Browser pane freezes scrolling and CSS animation and sometimes reports viewport width 0. Always `resize_window` before measuring, and verify structure and geometry rather than motion.

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `src/lib/networkLayout.ts` | Pure radial layout maths. People in, coordinates out. Never throws |
| `src/lib/networkLayout.test.ts` | Unit tests for the layout invariants |
| `src/lib/network.ts` | Pure API-side helpers: email normalising, cycle detection |
| `src/lib/network.test.ts` | Unit tests for those helpers |
| `vitest.config.ts` | Test runner config |
| `supabase/migrations/003_network_people.sql` | The table. Henry runs it in the Supabase SQL editor |
| `scripts/check-network-table.mjs` | Confirms the table and columns exist |
| `scripts/check-network-api.mjs` | End-to-end exercise of `/api/network`, cleans up after itself |
| `src/app/api/network/route.ts` | The only door to `network_people`. GET the graph, POST add/confirm/decline/remove/reparent |
| `src/components/ui/NetworkGraph.tsx` | SVG snowflake renderer. Presentational, takes people and gives back clicks |
| `src/app/leaders/network/page.tsx` | The leader-facing page: fetch, add form, graph, detail popover |

**Modify**

| File | Change |
|---|---|
| `src/components/ui/ProfileCard.tsx` | New optional `collapsible` prop and a collapsed avatar row |
| `src/app/leaders/page.tsx` | Collapsible profile, primary button row, four More Tools tiles, Quick Links toggle, confirmation banner, network button |
| `src/app/api/leader-access/route.ts` | On signup, claim or create the person's network node |
| `package.json` | Vitest devDependency and `test` scripts |

Boundary that matters: `networkLayout.ts` and `network.ts` are pure and tested. Everything touching Supabase or React is verified by running it. That keeps the fiddly maths out of the components.

---

## Task Order and Gates

Tasks 1 and 2 are independent. Task 3 needs Henry to run SQL before Tasks 5 onward can be verified. Tasks 6 to 9 build on the API.

⚠️ **Gate at Task 3:** stop and ask Henry to run the migration. Do not continue past Task 4 until `scripts/check-network-table.mjs` passes.

---

### Task 1: Dashboard restructure

Delivers the two quick wins Henry asked for first: Quick Links folded away and My Profile collapsed to an icon. The third primary button lands in Task 9, once the network page exists to link to.

**Files:**
- Modify: `src/components/ui/ProfileCard.tsx`
- Modify: `src/app/leaders/page.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ProfileCard` accepts `collapsible?: boolean` (default `false`). Task 9 relies on that prop already existing.

- [ ] **Step 1: Add the `collapsible` prop to ProfileCard**

In `src/components/ui/ProfileCard.tsx`, add `collapsible?: boolean;` to the `ProfileCardProps` interface (near line 99), then change the component signature (line 104) from:

```tsx
export default function ProfileCard({ email, fallbackName }: ProfileCardProps) {
```

to:

```tsx
export default function ProfileCard({ email, fallbackName, collapsible = false }: ProfileCardProps) {
```

Add the open state alongside the other `useState` calls (after `const [editing, setEditing] = useState(false);`):

```tsx
  // Collapsed by default only when the parent asks for it, so every other
  // caller keeps the old always-open behaviour.
  const [open, setOpen] = useState(!collapsible);
```

Add `ChevronUp` to the existing `lucide-react` import list at the top of the file.

- [ ] **Step 2: Render the collapsed row**

Insert this block immediately **after** the `if (loading) { ... }` block (which ends around line 221) and **before** the `// ---------- Edit mode ----------` comment:

```tsx
  // ---------- Collapsed ----------
  // Just the avatar. The dashboard leads with actions, not with your own face.
  if (collapsible && !open && !editing) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Open my profile"
          title="My Profile"
          className="rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {avatar(profile.avatar_url, "w-14 h-14", "text-base")}
        </button>
      </div>
    );
  }
```

- [ ] **Step 3: Add a collapse control to the expanded card**

In the display-mode return (starts line 418), replace this header block:

```tsx
      <div className="flex items-start justify-between gap-4 mb-6">
        <span className="eyebrow">My Profile</span>
        <button
          onClick={startEdit}
```

with:

```tsx
      <div className="flex items-start justify-between gap-4 mb-6">
        <span className="eyebrow">My Profile</span>
        <div className="flex items-center gap-2">
        {collapsible && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Collapse my profile"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={startEdit}
```

Then close the new wrapper: find the `</button>` that ends the Edit button (followed by `</div>`) and add one more `</div>` after it so the structure is button, button, `</div>`, `</div>`.

- [ ] **Step 4: Restructure the dashboard**

In `src/app/leaders/page.tsx`:

Add `ChevronDown` to the `lucide-react` import list.

Add quick-links state next to the other `useState` calls:

```tsx
  const [quickOpen, setQuickOpen] = useState(false);
```

Replace the `primaryCards` and `moreCards` arrays with:

```tsx
  // Featured up top. Discipleship Network joins these once its page exists.
  const primaryCards = [
    { id: "training", title: "Leader Training", icon: Video, href: "/leaders/training" },
    { id: "study", title: "Weekly Pathways Topics", icon: BookOpen, href: "/leaders/study-guides" },
  ];

  // Secondary tools, kept in a quieter section below.
  const moreCards = [
    { id: "support", title: "Leader Support", icon: HeadphonesIcon, href: "/leaders/support" },
    { id: "resources", title: "Resources", icon: FolderOpen, href: "/leaders/resources" },
    { id: "workshops", title: "Workshop Hub", icon: BarChart2, href: "/leaders/workshops" },
    { id: "admin", title: "Admin", icon: Lock, href: "/leaders/admin" },
  ];
```

Make the profile collapsible:

```tsx
        {/* My Profile */}
        <Reveal className="max-w-4xl mx-auto mb-5">
          <ProfileCard email={user.email} fallbackName={user.name} collapsible />
        </Reveal>
```

Change the featured grid wrapper from `grid grid-cols-1 gap-5 max-w-4xl mx-auto` to:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
```

- [ ] **Step 5: Fold Quick Links into a toggle**

Replace the whole Quick Links `<Reveal>` block (the one containing `<h2 ...>Quick Links</h2>`) with:

```tsx
        {/* Quick Links: folded away so the page leads with the tools */}
        <Reveal className="mt-6 max-w-4xl mx-auto">
          <button
            onClick={() => setQuickOpen((v) => !v)}
            aria-expanded={quickOpen}
            className="panel panel-interactive flex w-full items-center justify-between p-4"
          >
            <span className="text-sm font-medium text-white">Quick Links</span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--muted)] transition-transform ${
                quickOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {quickOpen && (
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={AVENUE_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="w-4 h-4" />
                Avenue Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href={LEADERS_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="w-4 h-4" />
                Leaders Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href="/" className={quickLinkClass}>
                <Globe className="w-4 h-4" />
                Main Website
              </a>
            </div>
          )}
        </Reveal>
```

- [ ] **Step 6: Verify in the browser**

Start or reuse the dev server on port 3000. Open the Browser pane at `http://localhost:3000/leaders`, seed the session, and reload:

```
localStorage.setItem('avenue_auth_session', JSON.stringify({id:'1',email:'info@avenuemission.com',name:'Avenue Admin'}))
```

Then `resize_window` to desktop first (the pane reports width 0 otherwise) and assert with `read_page` / `javascript_tool`:

| Check | Expected |
|---|---|
| Profile | One avatar button, no name, no facts visible |
| Click the avatar | Full card appears with a collapse chevron beside Edit |
| Click the chevron | Back to the bare avatar |
| Primary buttons | Exactly 2: Leader Training, Weekly Pathways Topics |
| More Tools tiles | Exactly 4, no Weekly Pathways Topics among them |
| Quick Links | A single closed toggle. No pills in the DOM until clicked |
| Click Quick Links | 3 links appear |
| Console | No errors |

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add src/components/ui/ProfileCard.tsx src/app/leaders/page.tsx
git commit -m "Collapse My Profile to an icon and fold Quick Links into a toggle

Profile card takes a new collapsible prop so the dashboard leads with
tools rather than your own face. Weekly Pathways Topics is promoted to
the primary row, leaving four tiles in More Tools, and Quick Links is
now a single toggle underneath.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

⚠️ `ProfileCard.tsx` and `leaders/page.tsx` already carry uncommitted work from a previous session. `git add` those two paths only. Never `git add -A`.

---

### Task 2: Vitest and the layout maths

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/networkLayout.ts`
- Test: `src/lib/networkLayout.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `layoutNetwork(people: NetworkPerson[], options?: { radiusStep?: number }): Layout` plus the exported types `NetworkPerson`, `LayoutNode`, `LayoutEdge`, `Bounds`, `Layout`. Task 7 renders from these exact shapes.

- [ ] **Step 1: Install Vitest and add scripts**

```bash
npm install -D vitest
```

Add to the `scripts` block in `package.json`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// fileURLToPath keeps this correct on Windows, where a bare URL pathname
// comes back as /C:/... and breaks module resolution.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/networkLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { layoutNetwork, type NetworkPerson } from "./networkLayout";

function person(
  id: string,
  sentOutBy: string | null = null,
  extra: Partial<NetworkPerson> = {}
): NetworkPerson {
  return {
    id,
    firstName: id.toUpperCase(),
    sentOutBy,
    linkStatus: "confirmed",
    joined: true,
    ...extra,
  };
}

const STEP = 100;
const opts = { radiusStep: STEP };
const radiusOf = (n: { x: number; y: number }) => Math.hypot(n.x, n.y);

describe("layoutNetwork", () => {
  it("returns an empty layout for no people", () => {
    const layout = layoutNetwork([], opts);
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });

  it("puts a lone person at the centre", () => {
    const layout = layoutNetwork([person("a")], opts);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ id: "a", x: 0, y: 0, depth: 0 });
  });

  it("rings a single root's children at one radius step", () => {
    const layout = layoutNetwork(
      [person("a"), person("b", "a"), person("c", "a"), person("d", "a")],
      opts
    );
    expect(layout.nodes).toHaveLength(4);
    expect(layout.edges).toHaveLength(3);

    const root = layout.nodes.find((n) => n.id === "a")!;
    expect(radiusOf(root)).toBeCloseTo(0);

    const kids = layout.nodes.filter((n) => n.id !== "a");
    for (const kid of kids) {
      expect(kid.depth).toBe(1);
      expect(radiusOf(kid)).toBeCloseTo(STEP);
    }

    // Three children must not land on top of each other.
    const angles = kids.map((k) => Math.atan2(k.y, k.x).toFixed(4));
    expect(new Set(angles).size).toBe(3);
  });

  it("pushes multiple roots out to depth 1 with no edge between them", () => {
    const layout = layoutNetwork([person("a"), person("b")], opts);
    expect(layout.edges).toHaveLength(0);
    for (const n of layout.nodes) {
      expect(n.depth).toBe(1);
      expect(radiusOf(n)).toBeCloseTo(STEP);
    }
  });

  it("treats a parent that does not exist as no parent", () => {
    const layout = layoutNetwork([person("a", "ghost")], opts);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.edges).toHaveLength(0);
    expect(layout.nodes[0].depth).toBe(0);
  });

  it("survives a two node cycle instead of hanging", () => {
    const layout = layoutNetwork([person("a", "b"), person("b", "a")], opts);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(0);
  });

  it("still places a person hanging off a cycle", () => {
    const layout = layoutNetwork(
      [person("a", "b"), person("b", "a"), person("c", "a")],
      opts
    );
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("handles a chain far deeper than any real network", () => {
    const people = [person("n0")];
    for (let i = 1; i < 60; i++) people.push(person(`n${i}`, `n${i - 1}`));

    const layout = layoutNetwork(people, opts);
    expect(layout.nodes).toHaveLength(60);
    expect(Math.max(...layout.nodes.map((n) => n.depth))).toBe(59);
  });

  it("marks pending links as unconfirmed edges", () => {
    const layout = layoutNetwork(
      [person("a"), person("b", "a", { linkStatus: "pending" })],
      opts
    );
    expect(layout.edges).toEqual([{ fromId: "a", toId: "b", confirmed: false }]);
  });

  it("covers every node in its bounds", () => {
    const layout = layoutNetwork(
      [person("a"), person("b", "a"), person("c", "a"), person("d", "b")],
      opts
    );
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(layout.bounds.minX);
      expect(n.x).toBeLessThanOrEqual(layout.bounds.maxX);
      expect(n.y).toBeGreaterThanOrEqual(layout.bounds.minY);
      expect(n.y).toBeLessThanOrEqual(layout.bounds.maxY);
    }
  });

  it("places people identically no matter what order they arrive in", () => {
    const people = [person("a"), person("b", "a"), person("c", "a"), person("d", "a")];
    const forward = layoutNetwork(people, opts);
    const backward = layoutNetwork([...people].reverse(), opts);

    for (const node of forward.nodes) {
      const other = backward.nodes.find((n) => n.id === node.id)!;
      expect(other.x).toBeCloseTo(node.x);
      expect(other.y).toBeCloseTo(node.y);
    }
  });

  it("gives a branch with more leaves a wider slice than a bare branch", () => {
    // "big" has three children and "small" has none, so of the four
    // leaves in the tree big owns three and earns three quarters of the
    // circle. Its children then sit a full pi apart. An equal split
    // between big and small would leave them only 2pi/3 apart, so the
    // threshold below is what separates weighted from naive.
    const layout = layoutNetwork(
      [
        person("root"),
        person("big", "root"),
        person("small", "root"),
        person("x", "big"),
        person("y", "big"),
        person("z", "big"),
      ],
      opts
    );
    const angles = layout.nodes
      .filter((n) => n.depth === 2)
      .map((n) => Math.atan2(n.y, n.x));
    expect(angles).toHaveLength(3);
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(2.5);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, every test errors with a resolve failure on `./networkLayout`.

- [ ] **Step 5: Implement the layout module**

Create `src/lib/networkLayout.ts`:

```ts
// ============================================================
// Radial "snowflake" layout for the discipleship network.
//
// Pure maths: people in, coordinates out. It never throws and it never
// loops forever. Bad input (a parent that does not exist, or a cycle)
// is treated as "no parent", so one corrupted row can never blank the
// page. /api/network is what stops cycles being written in the first
// place; this is the second line of defence.
// ============================================================

export interface NetworkPerson {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  sentOutBy: string | null;
  linkStatus: "pending" | "confirmed";
  joined: boolean;
}

export interface LayoutNode {
  id: string;
  person: NetworkPerson;
  x: number;
  y: number;
  depth: number;
}

export interface LayoutEdge {
  fromId: string;
  toId: string;
  confirmed: boolean;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: Bounds;
}

const DEFAULT_RADIUS_STEP = 170;
const TAU = Math.PI * 2;
const START_ANGLE = -Math.PI / 2; // first branch points straight up

// Walking up from startId, do we ever revisit a node? That covers both
// "this person is their own ancestor" and "this person hangs off someone
// else's cycle". Either way the parent link is not safe to draw.
function walkRevisits(parentOf: ReadonlyMap<string, string | null>, startId: string): boolean {
  const seen = new Set<string>([startId]);
  let current = parentOf.get(startId) ?? null;
  while (current !== null) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

export function layoutNetwork(
  people: NetworkPerson[],
  options: { radiusStep?: number } = {}
): Layout {
  const radiusStep = options.radiusStep ?? DEFAULT_RADIUS_STEP;
  const byId = new Map(people.map((p) => [p.id, p]));

  // 1. Keep only parent links that point at someone real.
  const rawParent = new Map<string, string | null>();
  for (const p of people) {
    rawParent.set(p.id, p.sentOutBy && byId.has(p.sentOutBy) ? p.sentOutBy : null);
  }

  // 2. Drop every link whose chain loops, judged against the untouched
  //    map above. Deciding against a map we were halfway through editing
  //    would make the result depend on array order. After this the graph
  //    is guaranteed to be a forest.
  const parentOf = new Map<string, string | null>();
  for (const p of people) {
    parentOf.set(p.id, walkRevisits(rawParent, p.id) ? null : rawParent.get(p.id) ?? null);
  }

  // 3. Index children, sorted so the chart does not reshuffle between loads.
  const order = [...people].sort((a, b) =>
    a.firstName.localeCompare(b.firstName) || a.id.localeCompare(b.id)
  );
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];
  for (const p of order) {
    const parent = parentOf.get(p.id) ?? null;
    if (parent === null) {
      roots.push(p.id);
    } else {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), p.id]);
    }
  }

  // 4. Leaf counts decide how much arc each branch earns, so a dense
  //    branch gets room and a bare one does not waste it.
  const leafCount = new Map<string, number>();
  const countLeaves = (id: string): number => {
    const kids = childrenOf.get(id) ?? [];
    const total = kids.length === 0 ? 1 : kids.reduce((sum, k) => sum + countLeaves(k), 0);
    leafCount.set(id, total);
    return total;
  };
  for (const rootId of roots) countLeaves(rootId);

  // 5. Hand each subtree its wedge and place its node at the midpoint.
  const nodes: LayoutNode[] = [];
  const place = (id: string, depth: number, from: number, to: number) => {
    const person = byId.get(id);
    if (!person) return;

    const angle = (from + to) / 2;
    const radius = depth * radiusStep;
    nodes.push({
      id,
      person,
      x: radius === 0 ? 0 : radius * Math.cos(angle),
      y: radius === 0 ? 0 : radius * Math.sin(angle),
      depth,
    });

    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return;
    const total = kids.reduce((sum, k) => sum + (leafCount.get(k) ?? 1), 0) || 1;
    let cursor = from;
    for (const kid of kids) {
      const span = ((leafCount.get(kid) ?? 1) / total) * (to - from);
      place(kid, depth + 1, cursor, cursor + span);
      cursor += span;
    }
  };

  if (roots.length === 1) {
    // One root reads best dead centre with the whole circle to spend.
    place(roots[0], 0, START_ANGLE, START_ANGLE + TAU);
  } else {
    const total = roots.reduce((sum, r) => sum + (leafCount.get(r) ?? 1), 0) || 1;
    let cursor = START_ANGLE;
    for (const rootId of roots) {
      const span = ((leafCount.get(rootId) ?? 1) / total) * TAU;
      place(rootId, 1, cursor, cursor + span);
      cursor += span;
    }
  }

  const edges: LayoutEdge[] = [];
  for (const p of order) {
    const parent = parentOf.get(p.id) ?? null;
    if (parent !== null) {
      edges.push({ fromId: parent, toId: p.id, confirmed: p.linkStatus === "confirmed" });
    }
  }

  const bounds = nodes.reduce<Bounds>(
    (acc, n) => ({
      minX: Math.min(acc.minX, n.x),
      minY: Math.min(acc.minY, n.y),
      maxX: Math.max(acc.maxX, n.x),
      maxY: Math.max(acc.maxY, n.y),
    }),
    { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  );

  return { nodes, edges, bounds };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 12 tests in `src/lib/networkLayout.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/networkLayout.ts src/lib/networkLayout.test.ts
git commit -m "Add Vitest and the radial network layout maths

Pure layout function for the discipleship snowflake: leaf-weighted
angular slices, one radius step per generation, single roots centred.
Bad parents and cycles are treated as no parent so a corrupted row can
never blank the page.

Vitest is a dev dependency only, so nothing changes in the deployed
bundle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The table

**Files:**
- Create: `supabase/migrations/003_network_people.sql`
- Create: `scripts/check-network-table.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: table `public.network_people` with columns `id, email, first_name, last_name, sent_out_by, link_status, added_by_email, joined, created_at, updated_at`. Tasks 5, 6 and 8 read and write exactly these names.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/003_network_people.sql`:

```sql
-- ============================================================
-- Discipleship network ("sent out by") graph.
--
-- One row per person, including people who have not made an Avenue
-- account yet. sent_out_by is the single parent, so the whole thing is
-- a forest of trees and link_status describes that one edge.
--
-- RLS is on with NO policies: every read and write goes through the
-- service-role API route (/api/network), matching leaders,
-- form_submissions and leader_profiles.
-- ============================================================

create table if not exists public.network_people (
  id             uuid primary key default gen_random_uuid(),

  -- Nullable: someone added by name only has no email yet. Stored
  -- lowercase and trimmed by the API so the unique index is meaningful.
  email          text unique,

  first_name     text not null,
  last_name      text,

  -- The one person who sent them out. Null means they are a root.
  sent_out_by    uuid references public.network_people(id) on delete set null,

  -- State of the edge to sent_out_by, not of the person.
  link_status    text not null default 'pending'
                 check (link_status in ('pending', 'confirmed')),

  added_by_email text,                            -- audit: who created this row
  joined         boolean not null default false,  -- true once a leaders row exists

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint network_people_no_self_parent
    check (sent_out_by is null or sent_out_by <> id)
);

create index if not exists network_people_sent_out_by_idx
  on public.network_people (sent_out_by);

alter table public.network_people enable row level security;

-- Deliberately no policies. updated_at is set by the API on each write
-- (see /api/network), so no trigger is needed here.
```

- [ ] **Step 2: Write the verification script**

Create `scripts/check-network-table.mjs`:

```js
// Confirms network_people exists with every column the API expects.
// Run: node --env-file=.env.local scripts/check-network-table.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  process.exit(1);
}

const { error } = await createClient(url, key)
  .from("network_people")
  .select(
    "id, email, first_name, last_name, sent_out_by, link_status, added_by_email, joined, created_at, updated_at"
  )
  .limit(1);

if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}

console.log("OK: network_people exists with every expected column");
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --env-file=.env.local scripts/check-network-table.mjs` from the repo root.
Expected: FAIL, a message about `network_people` not existing in the schema cache.

- [ ] **Step 4: Stop and ask Henry to run the migration**

⚠️ **Hard gate.** Do not continue past Task 4 until this passes.

Tell Henry, with the full path:

> Run `C:\Users\User\CascadeProjects\Avenue\supabase\migrations\003_network_people.sql` in the Supabase SQL editor for project `omepkrdyuymnqopaznid` (`avenue-workshops`), the same way `leader_profiles` was created.

- [ ] **Step 5: Run it again and verify it passes**

Run: `node --env-file=.env.local scripts/check-network-table.mjs`
Expected: `OK: network_people exists with every expected column`

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/003_network_people.sql scripts/check-network-table.mjs
git commit -m "Add the network_people table and a schema check script

One row per person in the discipleship network, including people with
no account. Single sent_out_by parent, link_status on the edge, RLS on
with no policies so only the service-role API can touch it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: API-side pure helpers

**Files:**
- Create: `src/lib/network.ts`
- Test: `src/lib/network.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `normaliseEmail(raw: unknown): string | null`, `wouldCreateCycle(parentOf: Map<string, string | null>, childId: string, newParentId: string | null): boolean`, and the constant `MAX_CHAIN`. Task 5 imports all three.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/network.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MAX_CHAIN, normaliseEmail, wouldCreateCycle } from "./network";

describe("normaliseEmail", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Henry.JAMcMahon@Gmail.com ")).toBe("henry.jamcmahon@gmail.com");
  });

  it("turns blank and non-strings into null", () => {
    expect(normaliseEmail("")).toBeNull();
    expect(normaliseEmail("   ")).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
    expect(normaliseEmail(undefined)).toBeNull();
    expect(normaliseEmail(42)).toBeNull();
  });
});

describe("wouldCreateCycle", () => {
  it("allows detaching to a root", () => {
    expect(wouldCreateCycle(new Map(), "a", null)).toBe(false);
  });

  it("rejects sending yourself out", () => {
    expect(wouldCreateCycle(new Map(), "a", "a")).toBe(true);
  });

  it("rejects a direct loop", () => {
    // b is already sent out by a, so a cannot be sent out by b.
    const parentOf = new Map<string, string | null>([["b", "a"], ["a", null]]);
    expect(wouldCreateCycle(parentOf, "a", "b")).toBe(true);
  });

  it("rejects a loop further up the chain", () => {
    const parentOf = new Map<string, string | null>([
      ["b", "a"],
      ["c", "b"],
      ["a", null],
    ]);
    expect(wouldCreateCycle(parentOf, "a", "c")).toBe(true);
  });

  it("allows an ordinary link", () => {
    const parentOf = new Map<string, string | null>([["b", null]]);
    expect(wouldCreateCycle(parentOf, "c", "b")).toBe(false);
  });

  it("refuses a chain longer than the cap rather than walking forever", () => {
    const parentOf = new Map<string, string | null>();
    for (let i = 1; i <= MAX_CHAIN + 10; i++) parentOf.set(`n${i}`, `n${i - 1}`);
    parentOf.set("n0", null);
    expect(wouldCreateCycle(parentOf, "fresh", `n${MAX_CHAIN + 10}`)).toBe(true);
  });

  it("refuses when the existing data already contains a loop", () => {
    const parentOf = new Map<string, string | null>([["x", "y"], ["y", "x"]]);
    expect(wouldCreateCycle(parentOf, "fresh", "x")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, resolve failure on `./network`.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/network.ts`:

```ts
// ============================================================
// Pure helpers for /api/network. No database, no React, so the rules
// that matter are unit tested rather than clicked through.
// ============================================================

// A person cannot be more than this many links from a root. Well past
// anything real, and it stops a corrupted chain hanging a request.
export const MAX_CHAIN = 50;

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  return cleaned === "" ? null : cleaned;
}

// Would setting childId's parent to newParentId close a loop? Walks up
// from the proposed parent. Anything suspicious (reaching the child,
// revisiting a node, or an absurdly long chain) is a refusal, because
// the cost of a false refusal is one confused leader and the cost of a
// false pass is a graph that hangs the page.
export function wouldCreateCycle(
  parentOf: Map<string, string | null>,
  childId: string,
  newParentId: string | null
): boolean {
  if (newParentId === null) return false;
  if (newParentId === childId) return true;

  const seen = new Set<string>();
  let current: string | null = newParentId;

  for (let hops = 0; current !== null; hops++) {
    if (hops >= MAX_CHAIN) return true;
    if (current === childId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }

  return false;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 9 tests in `src/lib/network.test.ts` and the 12 from Task 2 still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/network.ts src/lib/network.test.ts
git commit -m "Add cycle detection and email normalising for the network API

wouldCreateCycle walks up from the proposed sender and refuses anything
that reaches the child, revisits a node, or runs longer than fifty
links. Refusing is always the safe answer here.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The network API route

**Files:**
- Create: `src/app/api/network/route.ts`
- Create: `scripts/check-network-api.mjs`

**Interfaces:**
- Consumes: `normaliseEmail`, `wouldCreateCycle` from `src/lib/network.ts`; `getSupabaseAdmin`, `adminConfigError`, `isAdminAuthorized` from `src/lib/supabaseAdmin.ts`.
- Produces: `GET /api/network?email=` returning `{ viewerId: string | null, people: NetworkPerson[] }` where each person matches the `NetworkPerson` shape from `src/lib/networkLayout.ts`. `POST /api/network` accepting `{ action, ... }` for `add`, `confirm`, `decline`, `remove`, `reparent`. Tasks 8 and 9 call these.

- [ ] **Step 1: Write the route**

Create `src/app/api/network/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError, isAdminAuthorized } from "@/lib/supabaseAdmin";
import { normaliseEmail, wouldCreateCycle } from "@/lib/network";

interface Row {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  sent_out_by: string | null;
  link_status: "pending" | "confirmed";
  joined: boolean;
}

const COLUMNS = "id, email, first_name, last_name, sent_out_by, link_status, joined";

async function loadRows(): Promise<Row[]> {
  const { data, error } = await getSupabaseAdmin().from("network_people").select(COLUMNS);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

// Photos live on leader_profiles, keyed by email. One extra query beats
// duplicating avatar data into this table.
async function loadAvatars(rows: Row[]): Promise<Map<string, string>> {
  const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
  if (emails.length === 0) return new Map();

  const { data } = await getSupabaseAdmin()
    .from("leader_profiles")
    .select("email, avatar_url")
    .in("email", emails);

  const map = new Map<string, string>();
  for (const profile of data ?? []) {
    if (profile.avatar_url) map.set(profile.email, profile.avatar_url);
  }
  return map;
}

function splitName(full: string, email: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || email.split("@")[0],
    last: parts.slice(1).join(" ") || null,
  };
}

// Every leader gets a node the first time they touch the network, so the
// accounts that predate this table need no manual backfill. Returns null
// when the email is not a leader at all.
async function ensureNode(email: string): Promise<Row | null> {
  const db = getSupabaseAdmin();

  const { data: existing } = await db
    .from("network_people")
    .select(COLUMNS)
    .eq("email", email)
    .maybeSingle();
  if (existing) return existing as Row;

  const { data: leader } = await db
    .from("leaders")
    .select("name")
    .eq("email", email)
    .maybeSingle();
  if (!leader) return null;

  const { first, last } = splitName(String(leader.name ?? ""), email);
  const { data, error } = await db
    .from("network_people")
    .insert({
      email,
      first_name: first,
      last_name: last,
      joined: true,
      added_by_email: email,
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data as Row;
}

// GET /api/network?email=<viewer>
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const email = normaliseEmail(new URL(request.url).searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    const viewer = await ensureNode(email);
    if (!viewer) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    const rows = await loadRows();
    const avatars = await loadAvatars(rows);

    return NextResponse.json({
      viewerId: viewer.id,
      people: rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        avatarUrl: (r.email && avatars.get(r.email)) || null,
        sentOutBy: r.sent_out_by,
        linkStatus: r.link_status,
        joined: r.joined,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/network  { action, actorEmail, ... }
export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    // Admin action, authorised by Bearer token rather than actor email.
    if (action === "reparent") {
      if (!isAdminAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
      }

      const id = String(body.id ?? "");
      const newParentId = body.newParentId ? String(body.newParentId) : null;
      const rows = await loadRows();

      if (!rows.some((r) => r.id === id)) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }
      if (newParentId && !rows.some((r) => r.id === newParentId)) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
      }

      const parentOf = new Map(rows.map((r) => [r.id, r.sent_out_by]));
      if (wouldCreateCycle(parentOf, id, newParentId)) {
        return NextResponse.json({ error: "That would create a loop" }, { status: 400 });
      }

      const { error } = await db
        .from("network_people")
        .update({
          sent_out_by: newParentId,
          link_status: newParentId ? "confirmed" : "pending",
          updated_at: now,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    const actorEmail = normaliseEmail(body.actorEmail);
    if (!actorEmail) return NextResponse.json({ error: "actorEmail required" }, { status: 400 });

    const actor = await ensureNode(actorEmail);
    if (!actor) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    if (action === "add") {
      const firstName = String(body.firstName ?? "").trim();
      if (!firstName) {
        return NextResponse.json({ error: "First name is required" }, { status: 400 });
      }
      const lastName = String(body.lastName ?? "").trim() || null;
      const email = normaliseEmail(body.email);

      if (email) {
        const { data: found } = await db
          .from("network_people")
          .select(COLUMNS)
          .eq("email", email)
          .maybeSingle();

        if (found) {
          const row = found as Row;
          if (row.id === actor.id) {
            return NextResponse.json({ error: "You cannot send yourself out" }, { status: 400 });
          }
          if (row.sent_out_by) {
            const { data: sender } = await db
              .from("network_people")
              .select("first_name")
              .eq("id", row.sent_out_by)
              .maybeSingle();
            return NextResponse.json(
              { error: `${sender?.first_name ?? "Someone"} has already added them.` },
              { status: 409 }
            );
          }

          // Adopting an existing person can close a loop, so check first.
          const rows = await loadRows();
          const parentOf = new Map(rows.map((r) => [r.id, r.sent_out_by]));
          if (wouldCreateCycle(parentOf, row.id, actor.id)) {
            return NextResponse.json({ error: "That would create a loop" }, { status: 400 });
          }

          const { error } = await db
            .from("network_people")
            .update({ sent_out_by: actor.id, link_status: "pending", updated_at: now })
            .eq("id", row.id);
          if (error) throw new Error(error.message);
          return NextResponse.json({ ok: true, adopted: true });
        }
      }

      const { error } = await db.from("network_people").insert({
        email,
        first_name: firstName,
        last_name: lastName,
        sent_out_by: actor.id,
        link_status: "pending",
        added_by_email: actorEmail,
        joined: false,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, adopted: false });
    }

    if (action === "confirm") {
      if (!actor.sent_out_by) {
        return NextResponse.json({ error: "Nothing to confirm" }, { status: 400 });
      }
      const { error } = await db
        .from("network_people")
        .update({ link_status: "confirmed", updated_at: now })
        .eq("id", actor.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    // decline clears your own sender. remove clears a link you are on
    // either end of. Both leave the person and their branch in place.
    if (action === "decline" || action === "remove") {
      const id = action === "decline" ? actor.id : String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

      const { data: found } = await db
        .from("network_people")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (!found) return NextResponse.json({ error: "Person not found" }, { status: 404 });

      const row = found as Row;
      if (row.id !== actor.id && row.sent_out_by !== actor.id) {
        return NextResponse.json(
          { error: "You can only remove your own links" },
          { status: 403 }
        );
      }

      const { error } = await db
        .from("network_people")
        .update({ sent_out_by: null, link_status: "pending", updated_at: now })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the end-to-end check**

Create `scripts/check-network-api.mjs`. It talks to the running dev server and deletes everything it creates.

```js
// Exercises /api/network against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/check-network-api.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const TEST_EMAIL = "network-check-temp@example.invalid";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

const post = (body) =>
  fetch(`${BASE}/api/network`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

async function cleanup() {
  await db.from("network_people").delete().eq("email", TEST_EMAIL);
}

await cleanup();

try {
  console.log("GET");
  const res = await fetch(`${BASE}/api/network?email=${encodeURIComponent(LEADER)}`);
  const graph = await res.json();
  check("returns 200", res.status === 200, JSON.stringify(graph).slice(0, 200));
  check("gives the viewer a node", typeof graph.viewerId === "string");
  check("returns a people array", Array.isArray(graph.people));

  console.log("GET with an unknown email");
  const denied = await fetch(`${BASE}/api/network?email=nobody@example.invalid`);
  check("is refused with 403", denied.status === 403);

  console.log("add");
  const added = await post({
    action: "add",
    actorEmail: LEADER,
    firstName: "Temp",
    lastName: "Check",
    email: TEST_EMAIL,
  });
  check("succeeds", added.status === 200, JSON.stringify(added.json));

  const { data: row } = await db
    .from("network_people")
    .select("id, sent_out_by, link_status, joined, first_name")
    .eq("email", TEST_EMAIL)
    .maybeSingle();
  check("stores the person", !!row);
  check("hangs them off the actor", !!row?.sent_out_by);
  check("starts pending", row?.link_status === "pending");
  check("marks them as not joined", row?.joined === false);

  console.log("add the same person twice");
  const dup = await post({
    action: "add",
    actorEmail: LEADER,
    firstName: "Temp",
    email: TEST_EMAIL,
  });
  check("is refused with 409", dup.status === 409, JSON.stringify(dup.json));

  console.log("remove");
  const removed = await post({ action: "remove", actorEmail: LEADER, id: row.id });
  check("succeeds", removed.status === 200, JSON.stringify(removed.json));
  const { data: after } = await db
    .from("network_people")
    .select("sent_out_by")
    .eq("id", row.id)
    .maybeSingle();
  check("clears the sender", after?.sent_out_by === null);

  console.log("remove someone you are not linked to");
  const notYours = await post({ action: "remove", actorEmail: LEADER, id: row.id });
  check("is refused with 403", notYours.status === 403, JSON.stringify(notYours.json));

  console.log("unknown action");
  const bogus = await post({ action: "nonsense", actorEmail: LEADER });
  check("is refused with 400", bogus.status === 400);
} finally {
  await cleanup();
  console.log("cleaned up the temporary person");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll network API checks passed");
```

- [ ] **Step 3: Run the check and watch it pass**

Make sure the dev server is up on port 3000, then run:

`node --env-file=.env.local scripts/check-network-api.mjs`

Expected: every line prints `ok`, then `All network API checks passed`.

If anything fails, fix the route and rerun. Do not move on with failures.

- [ ] **Step 4: Confirm nothing was left behind**

```bash
node --env-file=.env.local -e "const {createClient}=require('@supabase/supabase-js');const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);s.from('network_people').select('email').then(r=>console.log(r.data))"
```

Expected: no `network-check-temp@example.invalid` row.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/app/api/network/route.ts scripts/check-network-api.mjs
git commit -m "Add the /api/network route

One service-role door to network_people: GET the whole graph with
avatars joined from leader_profiles, POST to add, confirm, decline,
remove or (admin only) reparent. Leaders get a node created lazily on
first contact, so the accounts that predate the table need no backfill.

Adoption of an existing person runs the cycle check first, since that is
the only add path that can close a loop.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Claim a node at signup

**Files:**
- Modify: `src/app/api/leader-access/route.ts`

**Interfaces:**
- Consumes: the `network_people` table from Task 3.
- Produces: nothing other tasks import.

- [ ] **Step 1: Add the claim helper**

In `src/app/api/leader-access/route.ts`, add this near the other Supabase helpers:

```ts
// When someone signs up, take over any node their discipler already
// created for them so they keep their place in the network.
//
// This is a convenience, not a guarantee: /api/network creates a node
// lazily for any leader who does not have one. That is why a failure
// here is logged and swallowed rather than blocking a signup.
async function claimNetworkNode(email: string, name: string): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || email.split("@")[0];
    const last = parts.slice(1).join(" ") || null;
    const now = new Date().toISOString();

    const { data: existing } = await db
      .from("network_people")
      .select("id, first_name")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      await db
        .from("network_people")
        .update({ joined: true, first_name: existing.first_name || first, updated_at: now })
        .eq("id", existing.id);
      return;
    }

    await db.from("network_people").insert({
      email,
      first_name: first,
      last_name: last,
      joined: true,
      added_by_email: email,
    });
  } catch (e) {
    console.error("claimNetworkNode failed:", (e as Error).message);
  }
}
```

- [ ] **Step 2: Call it after a successful signup**

In the `POST` handler (starts line 159), find this line:

```ts
    await saveLeader(newLeader);
```

Add immediately after it:

```ts
    // Take over any node their discipler already created for them.
    await claimNetworkNode(String(email).toLowerCase(), name);
```

- [ ] **Step 3: Verify with a temporary signup**

Sign up a throwaway leader through the running dev server, then check both tables and delete the test rows afterwards:

```bash
node --env-file=.env.local scripts/check-network-signup.mjs
```

Create `scripts/check-network-signup.mjs` first:

```js
// Signs up a throwaway leader, checks a network node appeared, cleans up.
// Run: node --env-file=.env.local scripts/check-network-signup.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const EMAIL = "signup-check-temp@example.invalid";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  await db.from("network_people").delete().eq("email", EMAIL);
  await db.from("leaders").delete().eq("email", EMAIL);
}

await cleanup();

// A discipler names them before they ever sign up.
const { data: seed } = await db
  .from("network_people")
  .insert({ email: EMAIL, first_name: "Placeholder", joined: false })
  .select("id")
  .single();

const res = await fetch(`${BASE}/api/leader-access`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, name: "Temp Signup" }),
});
console.log("signup status:", res.status);

const { data: node } = await db
  .from("network_people")
  .select("id, joined, first_name")
  .eq("email", EMAIL)
  .maybeSingle();

let failures = 0;
if (!node) { console.log("FAIL no node"); failures++; }
if (node && node.id !== seed.id) { console.log("FAIL created a duplicate instead of claiming"); failures++; }
if (node && node.joined !== true) { console.log("FAIL node was not marked joined"); failures++; }

await cleanup();
console.log(failures === 0 ? "OK: signup claims the existing node" : `${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
```

`POST /api/leader-access` reads `{ id, email, name }` from the body and requires `email` and `name`, so the body above is correct as written.

Expected: `OK: signup claims the existing node`

- [ ] **Step 4: Lint and commit**

```bash
npm run lint
git add src/app/api/leader-access/route.ts scripts/check-network-signup.mjs
git commit -m "Claim a person's network node when they sign up

If a discipler already named them, signing up takes over that node so
they keep their place in the network instead of appearing twice. A
failure here is logged and ignored, because /api/network creates a node
lazily anyway and a signup should never fail over this.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: The snowflake component

**Files:**
- Create: `src/components/ui/NetworkGraph.tsx`

**Interfaces:**
- Consumes: `layoutNetwork` and the `NetworkPerson` type from `src/lib/networkLayout.ts`.
- Produces: `<NetworkGraph people viewerId selectedId onSelect />` where `people: NetworkPerson[]`, `viewerId?: string | null`, `selectedId?: string | null`, `onSelect?: (person: NetworkPerson) => void`. Task 8 renders it.

📌 **Deviation from the spec, flag it to Henry:** the spec says curved edges. This uses straight spokes. In a radial layout, straight lines from parent to child read as the snowflake spokes and stay legible when branches get dense. Curves at this node size mostly add mush.

- [ ] **Step 1: Write the component**

Create `src/components/ui/NetworkGraph.tsx`:

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { layoutNetwork, type NetworkPerson } from "@/lib/networkLayout";

interface NetworkGraphProps {
  people: NetworkPerson[];
  viewerId?: string | null;
  selectedId?: string | null;
  onSelect?: (person: NetworkPerson) => void;
}

const NODE_R = 26;
const PAD = 110;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

function initialsOf(person: NetworkPerson) {
  const first = person.firstName?.[0] ?? "";
  const last = person.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

export default function NetworkGraph({
  people,
  viewerId,
  selectedId,
  onSelect,
}: NetworkGraphProps) {
  const layout = useMemo(() => layoutNetwork(people), [people]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const nodeById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes]
  );

  const { minX, minY, maxX, maxY } = layout.bounds;
  const viewBox = [
    minX - PAD,
    minY - PAD,
    Math.max(maxX - minX + PAD * 2, 1),
    Math.max(maxY - minY + PAD * 2, 1),
  ].join(" ");

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.x) / zoom,
      y: drag.current.panY + (e.clientY - drag.current.y) / zoom,
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const nudgeZoom = (factor: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));

  const buttonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all";

  return (
    <div className="panel relative overflow-hidden">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button onClick={() => nudgeZoom(1.25)} aria-label="Zoom in" className={buttonClass}>
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => nudgeZoom(0.8)} aria-label="Zoom out" className={buttonClass}>
          <Minus className="h-4 w-4" />
        </button>
        <button onClick={reset} aria-label="Fit the whole network" className={buttonClass}>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <svg
        data-testid="network-graph"
        viewBox={viewBox}
        className="h-[70vh] w-full touch-none select-none"
        style={{ cursor: drag.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          {layout.nodes
            .filter((n) => n.person.avatarUrl)
            .map((n) => (
              <clipPath key={n.id} id={`clip-${n.id}`}>
                <circle cx={n.x} cy={n.y} r={NODE_R} />
              </clipPath>
            ))}
        </defs>

        <g transform={`scale(${zoom}) translate(${pan.x} ${pan.y})`}>
          {layout.edges.map((edge) => {
            const from = nodeById.get(edge.fromId);
            const to = nodeById.get(edge.toId);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.fromId}-${edge.toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--border)"
                strokeWidth={1.5}
                strokeDasharray={edge.confirmed ? undefined : "5 5"}
                data-confirmed={edge.confirmed ? "true" : "false"}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const p = node.person;
            const isViewer = p.id === viewerId;
            const isSelected = p.id === selectedId;
            const ring = isViewer || isSelected ? "var(--accent)" : "var(--border)";

            return (
              <g
                key={node.id}
                data-person-id={p.id}
                data-joined={p.joined ? "true" : "false"}
                data-viewer={isViewer ? "true" : "false"}
                opacity={p.joined ? 1 : 0.55}
                onClick={() => onSelect?.(p)}
                className="cursor-pointer"
              >
                {p.avatarUrl ? (
                  <image
                    href={p.avatarUrl}
                    x={node.x - NODE_R}
                    y={node.y - NODE_R}
                    width={NODE_R * 2}
                    height={NODE_R * 2}
                    clipPath={`url(#clip-${node.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <circle cx={node.x} cy={node.y} r={NODE_R} fill="var(--surface-hover)" />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_R}
                  fill="none"
                  stroke={ring}
                  strokeWidth={isViewer || isSelected ? 2.5 : 1}
                />

                {!p.avatarUrl && (
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill="var(--accent)"
                  >
                    {initialsOf(p)}
                  </text>
                )}

                <text
                  x={node.x}
                  y={node.y + NODE_R + 18}
                  textAnchor="middle"
                  fontSize={13}
                  fill={isViewer ? "#ffffff" : "var(--muted)"}
                >
                  {p.firstName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Confirm it type-checks**

Run: `npm run lint`
Expected: no errors in `NetworkGraph.tsx`. The component is exercised for real in Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/NetworkGraph.tsx
git commit -m "Add the NetworkGraph snowflake renderer

Radial SVG over the pure layout module. Your own node gets an accent
ring, people who have not joined render faded, and unconfirmed links
render dashed. Drag to pan, buttons to zoom and refit.

Straight spokes rather than curved edges: in a radial tree the straight
lines are what read as the snowflake, and curves at this node size just
add mush.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The network page

**Files:**
- Create: `src/app/leaders/network/page.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/network` from Task 5, `<NetworkGraph>` from Task 7, `getCurrentUser` from `src/lib/auth.ts`, `Reveal` from `src/components/ui/Reveal`.
- Produces: the route `/leaders/network`, which Task 9 links to.

- [ ] **Step 1: Write the page**

Create `src/app/leaders/network/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Users, X } from "lucide-react";
import { getCurrentUser, type User } from "@/lib/auth";
import Reveal from "@/components/ui/Reveal";
import NetworkGraph from "@/components/ui/NetworkGraph";
import type { NetworkPerson } from "@/lib/networkLayout";

export default function NetworkPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [people, setPeople] = useState<NetworkPerson[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<NetworkPerson | null>(null);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });

  const load = useCallback(async (email: string) => {
    setError("");
    try {
      const res = await fetch(`/api/network?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the network.");
      setPeople(data.people ?? []);
      setViewerId(data.viewerId ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    setUser(current);
    load(current.email);
  }, [router, load]);

  const act = async (body: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/network", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, actorEmail: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      await load(user.email);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act({ action: "add", ...form });
    if (ok) {
      setForm({ firstName: "", lastName: "", email: "" });
      setAdding(false);
    }
  };

  const sentOutByName = (person: NetworkPerson) => {
    const parent = people.find((p) => p.id === person.sentOutBy);
    return parent ? parent.firstName : null;
  };

  const canRemove = (person: NetworkPerson) =>
    !!person.sentOutBy && (person.id === viewerId || person.sentOutBy === viewerId);

  const inputClass =
    "w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] transition-colors";

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the network…
        </div>
      </div>
    );
  }

  const mine = people.filter((p) => p.sentOutBy === viewerId);

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/leaders"
            className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Leaders Hub
          </Link>
          <span className="text-sm text-[var(--muted)]">{user.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Reveal className="mb-8 text-center">
          <span className="eyebrow">Multiplication</span>
          <h1 className="mb-2 mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Discipleship Network
          </h1>
          <p className="text-[var(--muted)]">
            Everyone Avenue has sent out, and everyone they have sent out in turn.
          </p>
        </Reveal>

        <Reveal className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-[var(--muted)]">
            {people.length} {people.length === 1 ? "person" : "people"} · you are sending out{" "}
            {mine.length}
          </span>
          <button
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-white transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add someone you sent out
          </button>
        </Reveal>

        {adding && (
          <Reveal className="mx-auto mb-6 max-w-xl">
            <form onSubmit={submitAdd} className="panel space-y-3 p-6">
              <span className="eyebrow">Someone you sent out</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="First name"
                  className={inputClass}
                />
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Last name (optional)"
                  className={inputClass}
                />
              </div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email (optional, lets them confirm)"
                className={inputClass}
              />
              <p className="text-xs text-[var(--muted)]">
                With an email they can confirm the link once they have an account. Without
                one they stay on the chart as a name only.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add to the network"}
              </button>
            </form>
          </Reveal>
        )}

        {error && (
          <div className="mx-auto mb-6 max-w-xl panel border-red-500/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {people.length === 0 ? (
          <Reveal className="mx-auto max-w-xl">
            <div className="panel p-10 text-center">
              <Users className="mx-auto mb-4 h-10 w-10 text-[var(--accent)]" />
              <h2 className="mb-2 text-xl font-semibold text-white">Nobody here yet</h2>
              <p className="text-sm text-[var(--muted)]">
                Add the first person you sent out and the network starts from there.
              </p>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <NetworkGraph
              people={people}
              viewerId={viewerId}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </Reveal>
        )}

        {selected && (
          <div className="mx-auto mt-6 max-w-xl">
            <div className="panel p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {[selected.firstName, selected.lastName].filter(Boolean).join(" ")}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {sentOutByName(selected)
                      ? `Sent out by ${sentOutByName(selected)}${
                          selected.linkStatus === "confirmed" ? "" : ", not confirmed yet"
                        }`
                      : "Not sent out by anyone yet"}
                  </p>
                  {!selected.joined && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Has not joined the site yet.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {canRemove(selected) && (
                <button
                  onClick={async () => {
                    const ok = await act({ action: "remove", id: selected.id });
                    if (ok) setSelected(null);
                  }}
                  disabled={saving}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-white transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  Remove this link
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Open `http://localhost:3000/leaders/network` with the session seeded, `resize_window` to desktop first.

| Check | Expected |
|---|---|
| First load | Your own node only, or the empty state if the table is bare |
| Add "Testperson" with no email | Node appears faded (`data-joined="false"`), dashed edge from you |
| Your node | `data-viewer="true"` and an accent ring |
| Click a node | Detail panel opens, says "Sent out by <you>, not confirmed yet" |
| Remove this link | Node stays, edge disappears |
| Zoom buttons | The `<g>` transform scale value changes |
| Console | No errors, no missing-key warnings |

Clean up any test people afterwards:

```bash
node --env-file=.env.local -e "const {createClient}=require('@supabase/supabase-js');const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);s.from('network_people').delete().eq('first_name','Testperson').then(r=>console.log('cleaned',r.error??'ok'))"
```

⚠️ Pan and zoom feel cannot be verified in the Browser pane. Ask Henry to drag it himself.

- [ ] **Step 3: Lint and commit**

```bash
npm run lint
git add src/app/leaders/network/page.tsx
git commit -m "Add the Discipleship Network page

Whole network on load with your own node ringed, a form to add someone
you sent out, and a detail panel with the remove action for links you
are on either end of. Empty state for a network with nobody in it yet.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Confirmation banner and the third button

**Files:**
- Modify: `src/app/leaders/page.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/network` from Task 5, the `/leaders/network` route from Task 8.
- Produces: the finished dashboard. Nothing later depends on it.

- [ ] **Step 1: Add the network button**

In `src/app/leaders/page.tsx`, add `Network` to the `lucide-react` import list, then extend `primaryCards`:

```tsx
  const primaryCards = [
    { id: "training", title: "Leader Training", icon: Video, href: "/leaders/training" },
    { id: "network", title: "Discipleship Network", icon: Network, href: "/leaders/network" },
    { id: "study", title: "Weekly Pathways Topics", icon: BookOpen, href: "/leaders/study-guides" },
  ];
```

Change the featured grid wrapper from `md:grid-cols-2` to:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
```

⚠️ Do **not** add `network` to `restrictedCards`. A leader awaiting authorization can still use the network.

- [ ] **Step 2: Fetch the pending link**

Add state next to the others:

```tsx
  const [pendingSender, setPendingSender] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
```

Add a fetch inside the existing `useEffect`, after the `leader-access` call, using the same `currentUser`:

```tsx
      // Has someone claimed to have sent this person out?
      fetch(`/api/network?email=${encodeURIComponent(currentUser.email)}`)
        .then((res) => res.json())
        .then((data) => {
          const me = data.people?.find((p: { id: string }) => p.id === data.viewerId);
          if (!me?.sentOutBy || me.linkStatus === "confirmed") return;
          const sender = data.people.find((p: { id: string }) => p.id === me.sentOutBy);
          setPendingSender(sender?.firstName ?? "Someone");
        })
        .catch(() => {
          // The banner is a nicety. A failure here must not break the dashboard.
        });
```

- [ ] **Step 3: Add the banner**

Add the handler above the `return`:

```tsx
  const answerPending = async (action: "confirm" | "decline") => {
    if (!user) return;
    setConfirming(true);
    try {
      await fetch("/api/network", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, actorEmail: user.email }),
      });
      setPendingSender(null);
    } finally {
      setConfirming(false);
    }
  };
```

Insert this block immediately after the page-title `<Reveal>` and before the My Profile block:

```tsx
        {/* Someone says they sent you out */}
        {pendingSender && (
          <Reveal className="mx-auto mb-5 max-w-4xl">
            <div className="panel p-6">
              <span className="eyebrow">Discipleship Network</span>
              <p className="mt-2 text-white">
                {pendingSender} says they sent you out.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => answerPending("confirm")}
                  disabled={confirming}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => answerPending("decline")}
                  disabled={confirming}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-white transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  Not right
                </button>
              </div>
            </div>
          </Reveal>
        )}
```

- [ ] **Step 4: Verify the whole flow in the browser**

Set up a real pending link between the two existing accounts:

```bash
node --env-file=.env.local -e "fetch('http://localhost:3000/api/network',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'add',actorEmail:'info@avenuemission.com',firstName:'Henry',email:'henry.jamcmahon@gmail.com'})}).then(r=>r.json()).then(console.log)"
```

Then, in the Browser pane, seed the session as Henry and open `/leaders`:

```
localStorage.setItem('avenue_auth_session', JSON.stringify({id:'2',email:'henry.jamcmahon@gmail.com',name:'Henry'}))
```

| Check | Expected |
|---|---|
| Banner | "Avenue Admin says they sent you out." with Confirm and Not right |
| Click Confirm | Banner disappears |
| Reload | Banner stays gone |
| `/leaders/network` | The edge between the two is now solid, not dashed |
| Primary buttons | Exactly 3, Discipleship Network in the middle |
| Seed the admin session again | No banner for that account |

Then reset the link so Henry starts clean:

```bash
node --env-file=.env.local -e "const {createClient}=require('@supabase/supabase-js');const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);s.from('network_people').update({sent_out_by:null,link_status:'pending'}).eq('email','henry.jamcmahon@gmail.com').then(r=>console.log('reset',r.error??'ok'))"
```

- [ ] **Step 5: Full check before handing back**

```bash
npm test
npm run lint
npm run build
```

Expected: tests pass, lint clean, build succeeds. A failing build means a broken deploy, and deploys are scarce here.

- [ ] **Step 6: Commit**

```bash
git add src/app/leaders/page.tsx
git commit -m "Add the Discipleship Network button and the confirmation banner

Third primary button on the dashboard, deliberately not access-gated so
a leader awaiting authorization can still map who they have sent out.
When someone claims to have sent you out, a panel above the profile asks
you to confirm or reject it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done means

| Check | How |
|---|---|
| Tests pass | `npm test` |
| Lint clean | `npm run lint` |
| Build succeeds | `npm run build` |
| Table verified | `node --env-file=.env.local scripts/check-network-table.mjs` |
| API verified | `node --env-file=.env.local scripts/check-network-api.mjs` |
| No test rows left | Query `network_people` and confirm only real people remain |
| Nothing pushed | `git status` shows commits ahead of origin, and you have not run `git push` |

Report to Henry with: what landed, what he still needs to eyeball (pan and zoom feel, mobile), the straight-spokes deviation from the spec, and the count of commits waiting to go out in the next deploy.

## Stage 2 (not in this plan)

The admin Network tab: same `NetworkGraph` with re-parent enabled, a flat table of everyone, and counters for total people, joined vs named-only, confirmed vs pending, roots, deepest chain, widest branch. Spec section 8. Write a separate plan once Stage 1 has real data in it.
