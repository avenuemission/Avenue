# Contributing

The house rules for changing this codebase: where code goes, how to write a route, how to test, how to commit.

## Before you push anything

- ✅ `npm run check` passes (typecheck, lint with 0 problems, tests, function bundle).
- ✅ `npm run knip` is clean.
- ✅ `npm run build` passes when you touched config, routing, dependencies or a layout.
- ✅ No em dashes anywhere (see below).
- ⚠️ Every push to `main` is a paid Netlify production deploy. Batch your work. See [docs/deployment.md](docs/deployment.md).

## Where code goes

| Code | Folder | Rule |
|---|---|---|
| Pages, layouts, route handlers | `src/app/` | Server Components by default. Add `"use client"` only for a part that needs state, effects or browser APIs |
| Components used by one page only | next to the page, in `_components/` or `_steps/` | The underscore keeps the folder out of the URL |
| Shared components | `src/components/{ui,site,leaders}` | `ui/` is primitives only |
| Fixed text and lists | `src/content/` | No logic |
| Pure logic | `src/lib/domain/` | No React, Next.js or Supabase. Easy to unit test |
| Browser-only helpers | `src/lib/client/` | |
| Server-only helpers | `src/lib/server/` | First line: `import "server-only";` |
| Email templates and engine | `src/lib/emails/` | Not `server-only` (the Netlify function uses them); lint keeps them out of client code |

The import boundary rules (ESLint enforces them, `npm run lint` fails on a break):

- ❌ `src/lib/**` never imports `src/app/**`.
- ❌ Client code (`components/`, `hooks/`, `lib/client/`) never imports `lib/server/*` or `lib/emails/*`. Only `lib/emails/{prefs,topic,schedule}` are shared.
- ❌ `lib/domain/` imports nothing framework specific.
- ❌ Server code and route handlers never import `lib/client/supabaseBrowser`. Use `getSupabaseAdmin()`.

The full table is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Route handler template

Every table access goes through `getSupabaseAdmin()`. A leader route starts with `requireLeader`; an admin route starts with `requireAdmin`. Unexpected errors go through `serverError`, which logs the cause and returns a generic message.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { jsonError, serverError } from "@/lib/server/http";

// GET /api/example: what it returns, for whom.
export async function GET(request: NextRequest) {
  const auth = await requireLeader(request); // first line, always
  if ("response" in auth) return auth.response;
  const email = auth.leader.email; // from the verified session, never the body

  const { data, error } = await getSupabaseAdmin().from("example").select("id, title").eq("email", email);
  if (error) return serverError("example GET", error);
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") return jsonError(400, "A title is required");
  // validate in lib/domain, write with getSupabaseAdmin(), return JSON
}
```

For an admin route, swap in `const auth = await requireAdmin(request);` from `@/lib/server/requireAdmin`. For a public route that sends email or calls OpenAI, add a rate limit: `if (!(await allow(RATE.form, clientIp(request)))) return tooMany();`. Limits live in one place: `RATE` in `src/lib/server/rateLimit.ts`.

## Naming

| Thing | Style | Example |
|---|---|---|
| Component files | PascalCase | `PathwayMap.tsx` |
| Hooks | `useX.ts` | `useCountdown.ts` |
| Other modules | camelCase | `requireLeader.ts` |
| Route folders and URLs | kebab-case | `leader-checkins/` |
| Database tables and columns | snake_case | `leader_email_log.period_key` |

## Tests

- Tests sit next to the code: `foo.ts` and `foo.test.ts` in the same folder.
- Vitest runs `src/**/*.test.ts` (`vitest.config.mts`).
- Tests never touch the network or the database. Mock `@/lib/server/supabaseAdmin` and use `src/test/fakeSupabase.ts`. Admin route tests use `src/test/adminRoute.ts`.
- Write the failing test first for any new helper or route.
- The test count only goes up. If you delete a dead test, say why in the commit.

## Fixtures and the live database

- There is no staging database. Scripts that write run against production.
- Fixture emails must end in `@example.invalid`. Delete them by exact email.
- Run `npm run guard` before and after: it must print `clean`.
- Details: [docs/operations.md](docs/operations.md).

## Fail loud

- No silent fallbacks to hard-coded data. If a read fails, throw or return an error.
- Tell the caller something generic; put the detail in the server log.

## No em dashes

The site owner's rule: no em dash (the long dash) anywhere. Not in code, comments, UI copy, docs or commit messages.

- Use a colon for a label, a comma for an aside, or start a new sentence.
- En dashes in number and date ranges (4–15 January) are fine.
- `src/test/noEmDash.test.ts` scans `src/`. It does not scan docs or commits, so check those yourself: `git diff --cached | grep -c "$(printf '\342\200\224')"` must print `0` (the printf makes the em dash character, U+2014).
- A test that needs the character builds it with `String.fromCharCode(0x2014)`.

## Commits

- Subject: `Area: what changed`, short. Examples: `Forms: one server route`, `Docs: README, architecture`.
- Body: a few bullet points on what and why.
- Stage exact paths. Never `git add -A` or `git add .`.
- Never commit `.env.local` or any backup file.
- AI-assisted commits end with the trailer:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
