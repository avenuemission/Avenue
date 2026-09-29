import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Lamplight palette (spec 2026-09-29 lamplight-colour): the main public pages
// use navy and amber, with blue kept for labels and hovers. No purple, and no
// solid blue fills (they read violet on black). The APEST quiz and the
// Stewardship survey keep their own blue theme for now, so they are skipped.
const SRC = fileURLToPath(new URL("..", import.meta.url));
const ROOTS = [join(SRC, "app", "(site)"), join(SRC, "components", "site")];
const SKIPPED = [join("app", "(site)", "apest-quiz"), join("app", "(site)", "technological-stewardship")];

const BANNED: { name: string; pattern: RegExp }[] = [
  { name: "a purple or violet class", pattern: /\b(purple|violet)-\d{2,3}\b/ },
  { name: "the old purple marker colour", pattern: /#8b5cf6/i },
  { name: "a solid accent fill", pattern: /bg-\[var\(--accent\)\]/ },
];

function publicFiles(): string[] {
  return ROOTS.flatMap((root) =>
    readdirSync(root, { recursive: true, encoding: "utf8" }).map((path) => join(root, path)),
  ).filter(
    (file) =>
      statSync(file).isFile() &&
      /\.(tsx|ts|css)$/.test(file) &&
      !SKIPPED.some((skip) => relative(SRC, file).startsWith(skip + sep)),
  );
}

describe("lamplight palette on the main pages", () => {
  it("scans the public page and site component files", () => {
    expect(publicFiles().length).toBeGreaterThan(20);
  });

  for (const { name, pattern } of BANNED) {
    it(`has no ${name}`, () => {
      const offenders = publicFiles().filter((file) => pattern.test(readFileSync(file, "utf8")));
      expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
    });
  }
});
