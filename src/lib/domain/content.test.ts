import { describe, expect, it } from "vitest";
import { nextEventStart, pathwayGroupFromRow, statValue, type IntersectionEventDate } from "./content";

describe("pathwayGroupFromRow", () => {
  it("turns a pathway_groups row into a map group", () => {
    expect(
      pathwayGroupFromRow({
        id: 3,
        name: "Clyde",
        latitude: -38.047,
        longitude: 145.306,
        time: "Saturday 1:30 pm",
        coordinator: "Sam",
        phone: "0400000000",
        running: true,
        description: "A house church.",
      })
    ).toEqual({
      id: 3,
      name: "Clyde",
      coordinates: [-38.047, 145.306],
      time: "Saturday 1:30 pm",
      coordinator: "Sam",
      running: true,
      description: "A house church.",
    });
  });

  it("shows empty text for the optional columns", () => {
    const group = pathwayGroupFromRow({ id: 1, name: "New", latitude: -37.8, longitude: 145, running: false });
    expect([group.time, group.coordinator, group.description, group.running]).toEqual(["", "", "", false]);
  });
});

describe("statValue", () => {
  const stats = [
    { key: "communities", value: 6, label: "Pathway Communities" },
    { key: "countries", value: 1, label: "Countries" },
  ];
  it("reads a counter by key", () => {
    expect(statValue(stats, "communities")).toBe(6);
  });
  it("throws for a missing counter instead of showing a made-up number", () => {
    expect(() => statValue(stats, "languages")).toThrow("site_stats has no languages row");
  });
});

describe("nextEventStart", () => {
  const date = (event_date: string, event_time = "19:00"): IntersectionEventDate => ({
    id: event_date,
    event_key: "prayerAndPraise",
    event_date,
    event_time,
  });

  it("is the first listed date still ahead, at its Melbourne time", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const next = nextEventStart([date("2026-09-30"), date("2026-10-07"), date("2026-10-14")], now);
    expect(next?.toISOString()).toBe("2026-10-07T08:00:00.000Z");
  });

  it("reads the event's own time", () => {
    const next = nextEventStart([date("2026-10-07", "18:30")], new Date("2026-10-01T00:00:00Z"));
    expect(next?.toISOString()).toBe("2026-10-07T07:30:00.000Z");
  });

  it("is null once every date has passed", () => {
    expect(nextEventStart([date("2026-09-30")], new Date("2026-10-01T00:00:00Z"))).toBeNull();
    expect(nextEventStart([], new Date("2026-10-01T00:00:00Z"))).toBeNull();
  });

  it("throws for a time that is not HH:MM", () => {
    expect(() => nextEventStart([date("2026-10-07", "7pm")], new Date("2026-10-01T00:00:00Z"))).toThrow();
  });
});
