import { describe, expect, it } from "vitest";
import { parseGuideDate, topicForWeek, type GuideRow } from "./topic";

const guide = (id: string, guide_date: string | null, topic = `Topic ${id}`): GuideRow => ({
  id,
  guide_date,
  series: "James",
  topic,
  scripture: "James 1",
  pdf_url: null,
});

// The week of Monday 5 October to Sunday 11 October 2026.
const MONDAY = "2026-10-05";

describe("parseGuideDate", () => {
  it("reads DD/MM/YYYY, with or without leading zeros and spaces", () => {
    expect(parseGuideDate("27/12/2025")).toBe("2025-12-27");
    expect(parseGuideDate("1/2/2026")).toBe("2026-02-01");
    expect(parseGuideDate(" 05/10/2026 ")).toBe("2026-10-05");
  });

  it("rejects impossible dates and other formats", () => {
    expect(parseGuideDate("31/02/2026")).toBeNull();
    expect(parseGuideDate("2026-10-05")).toBeNull();
    expect(parseGuideDate("Week 3")).toBeNull();
    expect(parseGuideDate("")).toBeNull();
    expect(parseGuideDate(null)).toBeNull();
  });
});

describe("topicForWeek", () => {
  it("picks the guide dated inside the week, the earliest if there are two", () => {
    const { topic } = topicForWeek(
      [guide("a", "10/10/2026"), guide("b", "07/10/2026"), guide("c", "28/09/2026")],
      MONDAY
    );
    expect(topic).toEqual({ guide: guide("b", "07/10/2026"), date: "2026-10-07", thisWeek: true });
  });

  it("counts the Sunday but not the next Monday", () => {
    expect(topicForWeek([guide("sun", "11/10/2026")], MONDAY).topic?.thisWeek).toBe(true);
    expect(topicForWeek([guide("mon", "12/10/2026")], MONDAY).topic).toBeNull();
  });

  it("falls back to the most recent past guide", () => {
    const { topic } = topicForWeek([guide("old", "14/09/2026"), guide("recent", "28/09/2026")], MONDAY);
    expect(topic).toMatchObject({ date: "2026-09-28", thisWeek: false });
    expect(topic?.guide.id).toBe("recent");
  });

  it("is null with only future guides or none", () => {
    expect(topicForWeek([guide("future", "19/10/2026")], MONDAY).topic).toBeNull();
    expect(topicForWeek([], MONDAY).topic).toBeNull();
  });

  it("skips and reports rows whose date cannot be read", () => {
    const { topic, unparseable } = topicForWeek([guide("x", "Week 3"), guide("y", null), guide("z", "06/10/2026")], MONDAY);
    expect(topic?.guide.id).toBe("z");
    expect(unparseable).toEqual(['x ("Week 3")', "y (null)"]);
  });
});
