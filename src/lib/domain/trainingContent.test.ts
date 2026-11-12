import { describe, expect, it } from "vitest";
import {
  callingSectionPromptKey,
  shuffledOptions,
  toModulePrompt,
  toVideoQuestion,
  type VideoQuestion,
} from "./trainingContent";

const row = {
  youtube_id: "abc",
  question: " Which? ",
  options: ["Right", "Wrong", "Also wrong"],
  correct_index: 0,
  explanation: "Because.",
};

describe("toVideoQuestion", () => {
  it("shapes a good row", () => {
    expect(toVideoQuestion(row)).toEqual({
      youtubeId: "abc",
      question: "Which?",
      options: ["Right", "Wrong", "Also wrong"],
      correctIndex: 0,
      explanation: "Because.",
    });
  });

  it("drops a row that can't make a question", () => {
    expect(toVideoQuestion({ ...row, options: ["Only one"] })).toBeNull();
    expect(toVideoQuestion({ ...row, options: "Right" })).toBeNull();
    expect(toVideoQuestion({ ...row, options: ["A", ""] })).toBeNull();
    expect(toVideoQuestion({ ...row, correct_index: 3 })).toBeNull();
    expect(toVideoQuestion({ ...row, correct_index: -1 })).toBeNull();
    expect(toVideoQuestion({ ...row, question: " " })).toBeNull();
  });

  it("allows a missing explanation", () => {
    expect(toVideoQuestion({ ...row, explanation: null })?.explanation).toBe("");
  });
});

describe("toModulePrompt", () => {
  it("keeps empty fields as null", () => {
    expect(toModulePrompt({ module: "calling", discussion_question: null, hint: "", passage: "Ephesians 4:11–16" })).toEqual({
      module: "calling",
      discussionQuestion: null,
      hint: null,
      passage: "Ephesians 4:11–16",
    });
    expect(toModulePrompt({ module: "" })).toBeNull();
  });
});

describe("shuffledOptions", () => {
  const q: VideoQuestion = { youtubeId: "x", question: "?", options: ["A", "B", "C"], correctIndex: 0, explanation: "" };

  it("keeps every option once and marks only the right one", () => {
    const out = shuffledOptions(q);
    expect(out.map((o) => o.text).sort()).toEqual(["A", "B", "C"]);
    expect(out.filter((o) => o.correct)).toEqual([{ text: "A", correct: true }]);
  });

  it("can move the right answer off the top", () => {
    // random 0 always swaps with the first slot, so A ends up last.
    expect(shuffledOptions(q, () => 0).map((o) => o.text)).toEqual(["B", "C", "A"]);
  });
});

describe("callingSectionPromptKey", () => {
  it("names a card for sections 1 to 5 only", () => {
    expect(callingSectionPromptKey(0)).toBe("calling-1");
    expect(callingSectionPromptKey(4)).toBe("calling-5");
    expect(callingSectionPromptKey(5)).toBeNull();
  });
});
