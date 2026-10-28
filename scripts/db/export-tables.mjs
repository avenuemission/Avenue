// Exports every public table as JSON with the service role, before any
// migration that deletes or drops. Read only.
//
// Run: node --env-file=.env.local scripts/db/export-tables.mjs <outDir>
//
// Writes <outDir>/<table>.json (an array of rows) and <outDir>/manifest.json
// (row counts and the time). The files hold personal data, so outDir must be
// outside the repo, and an existing manifest is never overwritten.
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Every table in public, each with a stable order for paging.
const TABLES = [
  ["form_submissions", "id"],
  ["pathway_groups", "id"],
  ["intersection_events", "key"],
  ["intersection_event_dates", "id"],
  ["study_guides", "id"],
  ["site_stats", "key"],
  ["leaders", "email"],
  ["leader_profiles", "email"],
  ["network_people", "id"],
  ["leader_training_progress", "email"],
  ["leader_checkins", "email,week_start"],
  ["leader_people", "id"],
  ["leader_worksheets", "email,kind"],
  ["leader_email_prefs", "email"],
  ["leader_email_log", "id"],
  ["workshop_sessions", "code"],
  ["survey_responses", "id"],
  ["rate_limits", "key"],
  ["crossing_scores", "id"],
  ["onramp_signups", "id"],
];
const PAGE = 1000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const outArg = process.argv[2];
if (!outArg) fail("Usage: node --env-file=.env.local scripts/db/export-tables.mjs <outDir> (outside the repo)");

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = resolve(outArg);
const fromRepo = relative(repoRoot.toLowerCase(), outDir.toLowerCase());
const outsideRepo = fromRepo.split(sep)[0] === ".." || isAbsolute(fromRepo);
if (!outsideRepo) {
  fail(`Refusing to write personal data inside the repo: ${outDir}`);
}
if (existsSync(join(outDir, "manifest.json"))) fail(`A backup already exists in ${outDir}. Pick a new folder.`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (use --env-file=.env.local).");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function readAll(table, orderBy) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = db.from(table).select("*");
    for (const column of orderBy.split(",")) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

mkdirSync(outDir, { recursive: true });
const manifest = { exportedAt: new Date().toISOString(), project: new URL(url).hostname, tables: {} };
for (const [table, orderBy] of TABLES) {
  const rows = await readAll(table, orderBy);
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
  manifest.tables[table] = rows.length;
  console.log(`${table}: ${rows.length}`);
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${TABLES.length} tables to ${outDir}`);
