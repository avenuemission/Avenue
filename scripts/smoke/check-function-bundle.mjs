// Bundles the Netlify scheduled function the way Netlify does (esbuild,
// plain Node, no react-server condition), imports the bundle and checks its
// default export is a function. It never calls the function, so nothing is
// read, sent or written. Catches a module in the function's import graph
// that cannot load in plain Node (for example one guarded with server-only).
// Run: node scripts/smoke/check-function-bundle.mjs
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const ENTRY = join(REPO, "netlify", "functions", "leader-emails.mts");
const outDir = mkdtempSync(join(tmpdir(), "avenue-function-bundle-"));
const outFile = join(outDir, "leader-emails.mjs");

try {
  const args = [
    "--yes",
    "esbuild@0.28.2",
      ENTRY,
    "--bundle",
    "--platform=node",
    "--format=esm",
      `--outfile=${outFile}`,
    "--log-level=warning",
    // Bundled CommonJS dependencies (nodemailer) call require().
    "--banner:js=import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  ];
  // npx is a .cmd on Windows, which only runs through a shell.
  if (process.platform === "win32") {
    execSync(["npx", ...args.map((a) => `"${a}"`)].join(" "), { cwd: REPO, stdio: "inherit" });
  } else {
    execFileSync("npx", args, { cwd: REPO, stdio: "inherit" });
  }

  let mod;
  try {
    mod = await import(pathToFileURL(outFile).href);
  } catch (err) {
    console.error(`FAIL: the bundled function does not load in plain Node: ${err.message}`);
    process.exit(1);
  }
  if (typeof mod.default !== "function") {
    console.error(`FAIL: default export is ${typeof mod.default}, expected a function`);
    process.exit(1);
  }
  console.log("function bundle ok");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
