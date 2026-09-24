import { describe, expect, it } from "vitest";
import { topicForWeek, type GuideRow } from "./topic";

const guide = (id: string, guide_on: string | null, topic = `Topic ${id}`): GuideRow => ({
  id,
  guide_on,
  series: "James",
  topic,
  scripture: "James 1",
  pdf_url: null,
});

// The week of Monday 5 October to Sunday 11 October 2026.
const MONDAY = "2026-10-05";

describe("topicForWeek", () => {
  it("picks the guide dated inside the week, the earliest if there are two", () => {
    const { topic } = topicForWeek(
      [guide("a", "2026-10-10"), guide("b", "2026-10-07"), guide("c", "2026-09-28")],
      MONDAY
    );
    expect(topic).toEqual({ guide: guide("b", "2026-10-07"), date: "2026-10-07", thisWeek: true });
  });

  it("counts the Sunday but not the next Monday", () => {
    expect(topicForWeek([guide("sun", "2026-10-11")], MONDAY).topic?.thisWeek).toBe(true);
    expect(topicForWeek([guide("mon", "2026-10-12")], MONDAY).topic).toBeNull();
  });

  it("falls back to the most recent past guide", () => {
    const { topic } = topicForWeek([guide("old", "2026-09-14"), guide("recent", "2026-09-28")], MONDAY);
    expect(topic).toMatchObject({ date: "2026-09-28", thisWeek: false });
    expect(topic?.guide.id).toBe("recent");
  });

  it("is null with only future guides or none", () => {
    expect(topicForWeek([guide("future", "2026-10-19")], MONDAY).topic).toBeNull();
    expect(topicForWeek([], MONDAY).topic).toBeNull();
  });

  it("skips and reports rows whose date cannot be read", () => {
    const { topic, unparseable } = topicForWeek([guide("x", "Week 3"), guide("y", null), guide("z", "2026-10-06")], MONDAY);
    expect(topic?.guide.id).toBe("z");
    expect(unparseable).toEqual(['x ("Week 3")', "y (null)"]);
  });
});
