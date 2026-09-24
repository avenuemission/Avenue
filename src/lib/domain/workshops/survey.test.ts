import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { answerColumns, blankAnswers, scaleResultLabel, SURVEY_SECTIONS, TEGMARK_OUTCOMES } from "./survey";

const repo = process.cwd();

// The survey_responses columns from the baseline migration, minus the ones
// no question fills.
function tableAnswerColumns(): string[] {
  const sql = fs.readFileSync(path.join(repo, "supabase/migrations/010_baseline_workshops.sql"), "utf8");
  const body = /create table if not exists public\.survey_responses \(([\s\S]*?)\n\);/.exec(sql)?.[1];
  if (!body) throw new Error("survey_responses table not found in migration 010");
  return body
    .split("\n")
    .map((line) => /^\s*([a-z_0-9]+)\s/.exec(line)?.[1])
    .filter((c): c is string => !!c && !["id", "session_code", "submitted_at"].includes(c));
}

describe("the survey definition", () => {
  it("stores every answer in a real survey_responses column, and fills every answer column", () => {
    const columns = answerColumns().map((a) => a.column);
    expect([...columns].sort()).toEqual([...tableAnswerColumns()].sort());
  });

  it("uses each field and each column once", () => {
    const all = answerColumns();
    expect(new Set(all.map((a) => a.field)).size).toBe(all.length);
    expect(new Set(all.map((a) => a.column)).size).toBe(all.length);
  });

  it("matches the field-to-column pairs the submit route writes", () => {
    const route = fs.readFileSync(path.join(repo, "src/app/api/workshops/submit/route.ts"), "utf8");
    const pairs = [...route.matchAll(/(\w+): (?:Array\.isArray\(surveyData\.\w+\) \? )?surveyData\.(\w+)/g)].map(
      (m) => `${m[2]}->${m[1]}`
    );
    const expected = answerColumns().map((a) => `${a.field}->${a.column}`);
    expect([...new Set(pairs)].sort()).toEqual([...expected].sort());
  });

  it("has five sections, 01 to 05, with the ranking in the last", () => {
    expect(SURVEY_SECTIONS.map((s) => s.num)).toEqual(["01", "02", "03", "04", "05"]);
    expect(SURVEY_SECTIONS[4].questions.some((q) => q.kind === "ranking")).toBe(true);
    expect(TEGMARK_OUTCOMES).toHaveLength(7);
  });

  it("starts blank: lists empty, everything else empty text", () => {
    const blank = blankAnswers();
    expect(blank.aiTools).toEqual([]);
    expect(blank.whoShouldLead).toEqual([]);
    expect(blank.tegmarkRankProtector).toBe("");
    expect(blank.finalVision).toBe("");
    expect(Object.keys(blank)).toHaveLength(answerColumns().length);
  });

  it("labels scale answers for the results page", () => {
    expect(scaleResultLabel({ value: "1", label: "Strongly Disagree" })).toBe(`1 ${String.fromCharCode(0x2013)} Strongly Disagree`);
    expect(scaleResultLabel({ value: "?", label: "Not Sure" })).toBe("Not Sure");
  });
});
