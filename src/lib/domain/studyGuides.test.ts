import { describe, expect, it } from "vitest";
import { dayMonthYearToGuideOn, formatGuideOn, guideOnToLocalDate, parseGuideOn, studyGuideWrite } from "./studyGuides";

describe("parseGuideOn", () => {
  it("reads the ISO date Postgres sends for study_guides.guide_on", () => {
    expect(parseGuideOn("2026-10-07")).toBe("2026-10-07");
    expect(parseGuideOn("2025-12-27")).toBe("2025-12-27");
    expect(parseGuideOn(" 2026-02-01 ")).toBe("2026-02-01");
  });

  it("rejects impossible dates, other formats and non-strings", () => {
    expect(parseGuideOn("2026-02-31")).toBeNull();
    expect(parseGuideOn("2026-13-01")).toBeNull();
    expect(parseGuideOn("2026-2-1")).toBeNull();
    expect(parseGuideOn("7/10/2026")).toBeNull();
    expect(parseGuideOn("2026-10-07T00:00:00Z")).toBeNull();
    expect(parseGuideOn("Week 3")).toBeNull();
    expect(parseGuideOn("")).toBeNull();
    expect(parseGuideOn(null)).toBeNull();
    expect(parseGuideOn(undefined)).toBeNull();
    expect(parseGuideOn(20261007)).toBeNull();
  });
});

describe("formatGuideOn", () => {
  it("shows the date the way the old text column did: D/M/YYYY, no leading zeros", () => {
    expect(formatGuideOn("2026-10-07")).toBe("7/10/2026");
    expect(formatGuideOn("2025-12-27")).toBe("27/12/2025");
    expect(formatGuideOn("2026-02-01")).toBe("1/2/2026");
  });

  it("is empty for a value that is not a date", () => {
    expect(formatGuideOn("Week 3")).toBe("");
    expect(formatGuideOn(null)).toBe("");
  });
});

describe("guideOnToLocalDate", () => {
  it("is local midnight on that day", () => {
    const d = guideOnToLocalDate("2026-10-07");
    expect(d).not.toBeNull();
    expect([d!.getFullYear(), d!.getMonth(), d!.getDate(), d!.getHours(), d!.getMinutes()]).toEqual([2026, 9, 7, 0, 0]);
  });

  it("is null for a value that is not a date", () => {
    expect(guideOnToLocalDate("31/02/2026")).toBeNull();
    expect(guideOnToLocalDate(undefined)).toBeNull();
  });
});

describe("dayMonthYearToGuideOn", () => {
  it("turns the legacy D/M/YYYY text into an ISO date, with or without leading zeros", () => {
    expect(dayMonthYearToGuideOn("27/12/2025")).toBe("2025-12-27");
    expect(dayMonthYearToGuideOn("1/2/2026")).toBe("2026-02-01");
    expect(dayMonthYearToGuideOn(" 05/10/2026 ")).toBe("2026-10-05");
  });

  it("rejects impossible dates and other formats", () => {
    expect(dayMonthYearToGuideOn("31/02/2026")).toBeNull();
    expect(dayMonthYearToGuideOn("2026-10-05")).toBeNull();
    expect(dayMonthYearToGuideOn("Week 3")).toBeNull();
    expect(dayMonthYearToGuideOn("")).toBeNull();
    expect(dayMonthYearToGuideOn(null)).toBeNull();
  });

  it("round trips with formatGuideOn", () => {
    for (const text of ["7/10/2026", "27/12/2025", "1/2/2026"]) {
      expect(formatGuideOn(dayMonthYearToGuideOn(text))).toBe(text);
    }
  });
});

describe("studyGuideWrite", () => {
  it("keeps only the editable columns and requires a real guide_on on create", () => {
    const body = {
      id: "ignored",
      guide_date: "7/10/2026",
      created_at: "x",
      guide_on: "2026-10-07",
      series: "James",
      topic: "Joy",
      scripture: "James 1",
      spotify_url: "",
      pdf_url: "",
      color: "#3b82f6",
      sort_order: 3,
    };
    expect(studyGuideWrite(body, "create")).toEqual({
      row: {
        guide_on: "2026-10-07",
        series: "James",
        topic: "Joy",
        scripture: "James 1",
        spotify_url: "",
        pdf_url: null,
        color: "#3b82f6",
        sort_order: 3,
      },
    });
  });

  it("refuses a missing or unreadable date on create", () => {
    expect(studyGuideWrite({ topic: "Joy" }, "create")).toEqual({ error: "guide_on must be a date (YYYY-MM-DD)" });
    expect(studyGuideWrite({ guide_on: "7/10/2026" }, "create")).toEqual({ error: "guide_on must be a date (YYYY-MM-DD)" });
  });

  it("lets an update leave the date alone but never blank it", () => {
    expect(studyGuideWrite({ topic: "Hope" }, "update")).toEqual({ row: { topic: "Hope" } });
    expect(studyGuideWrite({ guide_on: "" }, "update")).toEqual({ error: "guide_on must be a date (YYYY-MM-DD)" });
  });

  it("defaults sort_order to 0 on create only", () => {
    expect(studyGuideWrite({ guide_on: "2026-10-07" }, "create")).toEqual({ row: { guide_on: "2026-10-07", sort_order: 0 } });
  });

  it("refuses a body that is not an object", () => {
    expect(studyGuideWrite(null, "create")).toEqual({ error: "Body must be an object" });
    expect(studyGuideWrite([], "update")).toEqual({ error: "Body must be an object" });
  });
});
