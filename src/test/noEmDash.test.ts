import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// House rule: no em dash anywhere in the site's source, in any of the forms
// that reach a reader. Each form is built from pieces so this file does not
// contain one itself; tests that need the character build it with
// String.fromCharCode(0x2014), which no form below matches.
const FORMS: { name: string; test: (text: string) => boolean }[] = [
  { name: "the character", test: (t) => t.includes(String.fromCharCode(0x2014)) },
  { name: "a \\u escape", test: (t) => t.includes("\\" + "u2014") },
  { name: "the mdash entity", test: (t) => t.includes("&" + "mdash;") },
  { name: "a numeric entity", test: (t) => new RegExp("&#(8212|x2014);", "i").test(t) },
];

const SRC = fileURLToPath(new URL("..", import.meta.url));

// Every non-binary file under src. A file with a NUL byte (images, icons)
// is binary and skipped.
function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .map((path) => join(SRC, path))
    .filter((file) => statSync(file).isFile() && !readFileSync(file).includes(0));
}

describe("no em dashes in src", () => {
  it("finds the source files and skips binary ones", () => {
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.endsWith(".css"))).toBe(true);
    expect(files.some((f) => /\.(png|ico)$/.test(f))).toBe(false);
  });

  it("has none in any form", () => {
    const hits: string[] = [];
    for (const file of sourceFiles()) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const form of FORMS) {
          if (form.test(line)) hits.push(`${file.slice(SRC.length)}:${i + 1} (${form.name})`);
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it("catches each form", () => {
    const samples = [
      `a ${String.fromCharCode(0x2014)} b`,
      "a \\" + "u2014 b",
      "a &" + "mdash; b",
      "a &#" + "8212; b",
      "a &#" + "X2014; b",
    ];
    for (const sample of samples) expect(FORMS.some((f) => f.test(sample))).toBe(true);
    expect(FORMS.some((f) => f.test("4–15 January"))).toBe(false);
  });
});
