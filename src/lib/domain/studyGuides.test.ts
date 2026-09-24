import { describe, expect, it } from "vitest";
import { formatGuideOn, parseGuideOn, studyGuideWrite, weeklyTopic, type StudyGuide } from "./studyGuides";

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

describe("weeklyTopic", () => {
  const guide = (id: string, guide_on: string, series = "James", topic = `Topic ${id}`): StudyGuide => ({
    id,
    guide_on,
    series,
    topic,
    scripture: `James ${id}`,
    spotify_url: "",
    pdf_url: null,
    color: "#3b82f6",
    sort_order: Number(id),
  });

  it("is the latest guide dated on or before today, with every later guide grouped by series in date order", () => {
    const guides = [
      guide("1", "2026-09-10"),
      guide("2", "2026-09-17"),
      guide("3", "2026-10-01", "Ruth"),
      guide("4", "2026-09-24"),
      guide("5", "2026-10-08", "Ruth"),
    ];
    const week = weeklyTopic(guides, "2026-09-24");
    expect(week.current).toEqual({ topic: "Topic 4", series: "James", scripture: "James 4" });
    expect(week.upcoming).toEqual([
      { series: "Ruth", weeks: [
        { date: "1 Oct", topic: "Topic 3", scripture: "James 3" },
        { date: "8 Oct", topic: "Topic 5", scripture: "James 5" },
      ] },
    ]);
  });

  it("falls back to the soonest guide when every guide is still ahead", () => {
    const week = weeklyTopic([guide("2", "2026-10-15"), guide("1", "2026-10-08")], "2026-09-24");
    expect(week.current?.topic).toBe("Topic 1");
    expect(week.upcoming[0].weeks.map((w) => w.date)).toEqual(["8 Oct", "15 Oct"]);
  });

  it("skips a guide whose date cannot be read, and is empty with no guides", () => {
    const week = weeklyTopic([guide("1", "someday"), guide("2", "2026-09-17")], "2026-09-24");
    expect(week.current?.topic).toBe("Topic 2");
    expect(weeklyTopic([], "2026-09-24")).toEqual({ current: null, upcoming: [] });
  });

  it("keeps a series that comes back after another as its own group, in first-seen order", () => {
    const week = weeklyTopic(
      [guide("1", "2026-10-01", "A"), guide("2", "2026-10-08", "B"), guide("3", "2026-10-15", "A")],
      "2026-09-24"
    );
    expect(week.upcoming.map((g) => [g.series, g.weeks.length])).toEqual([["A", 2], ["B", 1]]);
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

  it("accepts a #rrggbb colour in either case and stores an empty one as null", () => {
    expect(studyGuideWrite({ color: "#A1b2C3" }, "update")).toEqual({ row: { color: "#A1b2C3" } });
    expect(studyGuideWrite({ color: "" }, "update")).toEqual({ row: { color: null } });
    expect(studyGuideWrite({ color: null }, "update")).toEqual({ row: { color: null } });
  });

  it("refuses any other colour, so the database check never turns into a 500", () => {
    const error = "color must be a hex colour like #3b82f6";
    expect(studyGuideWrite({ color: "blue" }, "update")).toEqual({ error });
    expect(studyGuideWrite({ color: "#fff" }, "update")).toEqual({ error });
    expect(studyGuideWrite({ color: "#3b82f6; x" }, "update")).toEqual({ error });
  });

  it("accepts https links and empty links", () => {
    expect(
      studyGuideWrite({ spotify_url: "https://open.spotify.com/x", pdf_url: "https://example.com/a.pdf" }, "update")
    ).toEqual({ row: { spotify_url: "https://open.spotify.com/x", pdf_url: "https://example.com/a.pdf" } });
    expect(studyGuideWrite({ spotify_url: "", pdf_url: "" }, "update")).toEqual({ row: { spotify_url: "", pdf_url: null } });
  });

  it("refuses javascript:, http and other non-https links", () => {
    expect(studyGuideWrite({ spotify_url: "javascript:alert(1)" }, "update")).toEqual({
      error: "spotify_url must be an https:// link",
    });
    expect(studyGuideWrite({ pdf_url: "http://example.com/a.pdf" }, "update")).toEqual({
      error: "pdf_url must be an https:// link",
    });
    expect(studyGuideWrite({ pdf_url: 5 }, "update")).toEqual({ error: "pdf_url must be an https:// link" });
  });

  it("refuses a body that is not an object", () => {
    expect(studyGuideWrite(null, "create")).toEqual({ error: "Body must be an object" });
    expect(studyGuideWrite([], "update")).toEqual({ error: "Body must be an object" });
  });
});
