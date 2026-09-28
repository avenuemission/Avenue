# Docs index

Every document in this repo, what it is for, and which ones describe the code today.

## Current: read these

| Doc | What it covers |
|---|---|
| [../README.md](../README.md) | What the site is, quick start, scripts, folder map |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Request flows, module boundaries, data model summary, caching |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Conventions, route handler template, tests, commits |
| [setup.md](setup.md) | A new machine, a new Supabase project, leader approval, the admin tabs |
| [deployment.md](deployment.md) | Netlify, env vars, the scheduled email function, deploy credits, go-live checklist |
| [database.md](database.md) | Tables, relationships diagram, access model, migrations |
| [security.md](security.md) | Sign-in, admin passcode, rate limits, headers and CSP |
| [operations.md](operations.md) | Backups, fixtures and `npm run guard`, smoke checks, email engine dry run |
| [../supabase/README.md](../supabase/README.md) | How to apply migrations, phase A and phase B |

## Content drafts (owner's words)

| Doc | What it is |
|---|---|
| [calling-content.md](calling-content.md) | The Calling phase text. Mirrors `src/content/calling.ts` |
| [launch-arena-content.md](launch-arena-content.md) | The Launch Scenarios draft (the Arena in code) and the Metrics step. Transcribed into `src/content/arena.ts` |

## History: do not treat as current

These record how the site got here. They describe the code **at the time they were written**. Where they disagree with the docs above, the docs above win.

| Folder | What it holds |
|---|---|
| [superpowers/specs/](superpowers/specs/) | Design specs for each piece of work, dated |
| [superpowers/plans/](superpowers/plans/) | The step-by-step plans that implemented those specs |
| [archive/](archive/) | Old workshop material and an old design export, kept for reference |

The most recent spec, `superpowers/specs/2026-09-24-cleanup-design.md`, explains the decisions behind the current structure (section 3 lists them).
