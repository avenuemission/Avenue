# Avenue website

The website for Avenue Mission (www.avenuemission.com): a public church site plus private tools for Avenue's leaders.

## What it is

| Part | Who uses it | Where |
|---|---|---|
| Public site | Anyone | `/`, `/vision`, `/pathways`, `/intersection`, `/streetlights`, `/apest-quiz`, `/technological-stewardship` |
| Leader tools | Signed-in leaders | `/leaders/*`: training, network, study guides, check-ins, workshops, resources, email settings |
| Admin | Staff with the admin passcode | `/leaders/admin`: form submissions, leaders and access, site content, church health, email previews |
| Leader emails | Leaders, by email | An hourly Netlify scheduled function sends weekly and monthly emails |

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database and sign-in | Supabase (Postgres + Auth, emailed one-time codes) |
| Email | Gmail SMTP through Nodemailer |
| Hosting | Netlify (Next.js runtime + one scheduled function) |
| Tests | Vitest |
| Quality | ESLint (with import boundary rules), knip (finds unused code) |

## Quick start

You need Node 20.9 or later (the repo is developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in the values (ask the site owner)
npm run dev                  # http://localhost:3000
```

⚠️ There is no staging database. `.env.local` points at the live Supabase project. Read [docs/operations.md](docs/operations.md) before running any script that writes.

Full setup, including a brand-new Supabase project: [docs/setup.md](docs/setup.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build. Reads Supabase, so it needs `.env.local` |
| `npm start` | Serves the production build |
| `npm run lint` | ESLint over the repo. Must print 0 problems |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run knip` | Finds unused files, exports and dependencies. Must be clean |
| `npm test` | Runs every Vitest test once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run check` | typecheck + lint + test + check:function, in that order |
| `npm run check:function` | Bundles the Netlify email function and checks it loads in plain Node |
| `npm run guard` | Reads the live database and fails if any test fixture row (`@example.invalid`) is left |

Other scripts live in `scripts/` and run with `node --env-file=.env.local <file>`. See [docs/operations.md](docs/operations.md).

## Folder map

```
src/
  app/                 routes (pages, layouts, API route handlers)
    (site)/            public pages; the brackets mean no URL segment
    leaders/           leader pages; layout.tsx is the one sign-in gate
    login/             sign-in page
    api/               route handlers (admin/, forms/[type], leader routes, workshops/)
    robots.ts          /robots.txt
    sitemap.ts         /sitemap.xml
  components/
    ui/                small shared primitives
    site/              public site components
    leaders/           leader components, one folder per area
  content/             fixed editorial content (text, lists), no logic
  hooks/               client React hooks
  lib/
    domain/            pure logic: no React, Next.js or Supabase
    client/            browser-only code (sign-in, fetch helpers)
    server/            server-only code (Supabase admin client, auth checks, rate limits)
    emails/            leader email engine and templates; public/ holds form emails
  test/                shared test helpers and the no-em-dash test
netlify/functions/     leader-emails.mts, the hourly scheduled function
supabase/              migrations/ (run in order) and legacy/ (first schema)
scripts/               db/, smoke/, tools/, guard and fixture helpers
public/images/         images (some are linked from sent emails: never rename)
private/               leader resources served only through a leader API route
docs/                  engineer docs (start at docs/README.md)
```

## Where to read next

| Doc | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | You want to know how a request flows and where code goes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Before your first change |
| [docs/setup.md](docs/setup.md) | Setting up a machine or a new Supabase project |
| [docs/deployment.md](docs/deployment.md) | Before any push to `main` |
| [docs/database.md](docs/database.md) | Touching tables or migrations |
| [docs/security.md](docs/security.md) | Touching sign-in, admin, headers or rate limits |
| [docs/operations.md](docs/operations.md) | Backups, fixtures, smoke checks, the email engine |
| [docs/README.md](docs/README.md) | The full docs index |
