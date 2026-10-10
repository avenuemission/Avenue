import { describe, expect, it } from "vitest";
import { LEADERBOARD_SIZE, bestPerInitials, initialsAllowed, maxPossibleScore, normaliseInitials, parseScoreSubmission, qualifies } from "./scores";

const good = { initials: "jem", score: 20, durationMs: 30_000 };

describe("normaliseInitials", () => {
  it("upper-cases and trims three letters", () => {
    expect(normaliseInitials(" jem ")).toBe("JEM");
    expect(normaliseInitials("ABC")).toBe("ABC");
  });

  it("refuses anything but three letters A to Z", () => {
    for (const bad of ["JE", "JEMM", "J3M", "JÉM", "J M", "", 123, null, undefined]) {
      expect(normaliseInitials(bad)).toBeNull();
    }
  });
});

describe("initialsAllowed", () => {
  it("blocks listed words and allows ordinary initials", () => {
    expect(initialsAllowed("KKK")).toBe(false);
    expect(initialsAllowed("FUK")).toBe(false);
    expect(initialsAllowed("JEM")).toBe(true);
    expect(initialsAllowed("HMC")).toBe(true);
  });
});

describe("parseScoreSubmission", () => {
  it("accepts a good score and normalises the initials", () => {
    expect(parseScoreSubmission(good)).toEqual({ ok: true, value: { initials: "JEM", score: 20, durationMs: 30_000 } });
  });

  it("refuses a body that is not an object", () => {
    for (const bad of [null, "x", 5, []]) expect(parseScoreSubmission(bad)).toEqual({ ok: false, error: "Invalid score" });
  });

  it("explains bad or blocked initials", () => {
    expect(parseScoreSubmission({ ...good, initials: "J" })).toEqual({ ok: false, error: "Initials must be three letters" });
    expect(parseScoreSubmission({ ...good, initials: "kkk" })).toEqual({ ok: false, error: "Please choose different initials" });
  });

  it("refuses scores that are not whole numbers from 1 to 9999", () => {
    for (const score of [0, -1, 1.5, 10_000, "20", null]) {
      expect(parseScoreSubmission({ ...good, score, durationMs: 7_000_000 })).toEqual({ ok: false, error: "Invalid score" });
    }
  });

  it("refuses a game shorter than a second or longer than two hours", () => {
    for (const durationMs of [999, 7_200_001, 1500.5, "30000"]) {
      expect(parseScoreSubmission({ ...good, score: 1, durationMs })).toEqual({ ok: false, error: "Invalid game length" });
    }
  });

  it("refuses a score faster than anyone can hop", () => {
    expect(maxPossibleScore(10_000)).toBe(101);
    expect(parseScoreSubmission({ ...good, score: 101, durationMs: 10_000 }).ok).toBe(true);
    expect(parseScoreSubmission({ ...good, score: 102, durationMs: 10_000 })).toEqual({ ok: false, error: "That score doesn't look right" });
  });
});

describe("qualifies", () => {
  const full = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({ score: 100 - i * 5 }));

  it("any real score makes a board with room", () => {
    expect(qualifies(1, [])).toBe(true);
    expect(qualifies(1, full.slice(0, 9))).toBe(true);
    expect(qualifies(0, [])).toBe(false);
  });

  it("a full board needs a score above its last place", () => {
    expect(qualifies(56, full)).toBe(true);
    expect(qualifies(55, full)).toBe(false);
  });
});

describe("bestPerInitials", () => {
  const row = (initials: string, score: number, at: string) => ({ initials, score, created_at: at });

  it("shows each set of initials once, at its best score", () => {
    const rows = [row("HJM", 90, "1"), row("HJM", 80, "2"), row("ABC", 70, "3"), row("HJM", 60, "4"), row("XYZ", 50, "5")];
    expect(bestPerInitials(rows)).toEqual([row("HJM", 90, "1"), row("ABC", 70, "3"), row("XYZ", 50, "5")]);
  });

  it("keeps the earlier score when one player ties their own best", () => {
    expect(bestPerInitials([row("HJM", 40, "early"), row("HJM", 40, "late")])).toEqual([row("HJM", 40, "early")]);
  });

  it("fills the board with different players even when one has every top score", () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => row("HJM", 500 - i, `a${i}`)),
      ...Array.from({ length: 12 }, (_, i) => row(`P${String.fromCharCode(65 + i)}Q`, 100 - i, `b${i}`)),
    ];
    const board = bestPerInitials(rows);
    expect(board).toHaveLength(LEADERBOARD_SIZE);
    expect(new Set(board.map((r) => r.initials)).size).toBe(LEADERBOARD_SIZE);
    expect(board[0]).toEqual(row("HJM", 500, "a0"));
  });
});
