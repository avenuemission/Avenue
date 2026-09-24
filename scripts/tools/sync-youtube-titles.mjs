// ============================================================
// Pull the real video titles from YouTube into the training page.
//
//   node scripts/tools/sync-youtube-titles.mjs          (rewrite in place)
//   node scripts/tools/sync-youtube-titles.mjs --check  (report only, no writes)
//
// Titles are stored in the source rather than fetched at runtime, so the
// page never waits on YouTube and the names are visible in code review.
// Re-run this whenever a video is renamed on YouTube.
//
// Uses the public oEmbed endpoint, which needs no API key.
// Each episode is numbered within its own module, so a module reads
// "1. The Mission", "2. The Vision", and so on.
// ============================================================
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve against this file's own location, not the shell's working
// directory, so the script runs the same from anywhere.
const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const FILE = join(REPO, "src", "content", "training", "phases.ts");
const checkOnly = process.argv.includes("--check");

// Matches one episode literal and captures its parts.
const EPISODE = /\{ id: "(?<eid>[^"]+)", title: "(?<title>[^"]*)", youtubeId: "(?<yt>[^"]+)"/g;

async function fetchTitle(id) {
  const url =
    "https://www.youtube.com/oembed?url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${id}`) +
    "&format=json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`oEmbed returned ${res.status}`);
  const { title } = await res.json();
  if (!title) throw new Error("oEmbed response had no title");
  return title;
}

const source = await readFile(FILE, "utf8");
const episodes = [...source.matchAll(EPISODE)].map((m) => m.groups);
if (episodes.length === 0) {
  console.error("FAIL: no episodes matched in src/content/training/phases.ts. Has the data shape changed?");
  process.exit(1);
}

// Episode ids look like p1m3e2: module p1m3, episode 2. Number within the module.
const seen = new Map();
const failures = [];
let out = source;
let changed = 0;

for (const ep of episodes) {
  const moduleId = ep.eid.replace(/e\d+$/, "");
  const position = (seen.get(moduleId) ?? 0) + 1;
  seen.set(moduleId, position);

  let real;
  try {
    real = await fetchTitle(ep.yt);
  } catch (err) {
    failures.push(`${ep.eid} (${ep.yt}): ${err.message}`);
    continue;
  }

  // JSON.stringify produces a correctly escaped JS string literal,
  // quotes included, so no hand-rolled escaping can get it wrong.
  const nextPlain = `${position}. ${real}`;
  const nextLiteral = JSON.stringify(nextPlain);
  const currentLiteral = JSON.stringify(ep.title);

  if (nextLiteral === currentLiteral) {
    console.log(`  same    ${ep.eid}  ${nextPlain}`);
    continue;
  }

  console.log(`  update  ${ep.eid}  ${ep.title}  ->  ${nextPlain}`);
  const from = `{ id: "${ep.eid}", title: ${currentLiteral}, youtubeId: "${ep.yt}"`;
  const to = `{ id: "${ep.eid}", title: ${nextLiteral}, youtubeId: "${ep.yt}"`;
  if (!out.includes(from)) {
    failures.push(`${ep.eid}: could not locate its literal to rewrite`);
    continue;
  }
  out = out.replace(from, to);
  changed++;
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
}

if (checkOnly) {
  console.log(`\n--check: ${changed} title(s) would change, ${failures.length} problem(s).`);
  process.exit(failures.length > 0 ? 1 : 0);
}

if (changed > 0) await writeFile(FILE, out, "utf8");
console.log(`\nWrote ${changed} title(s) to ${FILE}.`);
process.exit(failures.length > 0 ? 1 : 0);
