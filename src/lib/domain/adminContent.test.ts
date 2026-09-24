import { describe, expect, it } from "vitest";
import {
  intersectionDateWrite,
  intersectionEventWrite,
  isUuid,
  leaderAccessWrite,
  leaderCreateWrite,
  pathwayGroupWrite,
  positiveIntId,
  siteStatWrite,
  submissionArchiveWrite,
} from "./adminContent";

const UUID = "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c";

describe("ids", () => {
  it("isUuid accepts a uuid and nothing else", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid(7)).toBe(false);
  });

  it("positiveIntId reads a positive integer from a number or its digits", () => {
    expect(positiveIntId(4)).toBe(4);
    expect(positiveIntId("12")).toBe(12);
    expect(positiveIntId("0")).toBeNull();
    expect(positiveIntId("1; drop")).toBeNull();
    expect(positiveIntId(null)).toBeNull();
  });
});

describe("pathwayGroupWrite", () => {
  const full = {
    id: 3,
    created_at: "2026-01-01T00:00:00Z",
    name: "North Side",
    latitude: -37.8,
    longitude: 144.9,
    time: "Tue 7pm",
    coordinator: "Ann",
    phone: "0400 000 000",
    running: true,
    description: "Weekly",
    sort_order: 2,
    extra: "dropped",
  };

  it("keeps only the editable columns", () => {
    expect(pathwayGroupWrite(full, "create")).toEqual({
      row: {
        name: "North Side",
        latitude: -37.8,
        longitude: 144.9,
        time: "Tue 7pm",
        coordinator: "Ann",
        phone: "0400 000 000",
        running: true,
        description: "Weekly",
        sort_order: 2,
      },
    });
  });

  it("defaults running and sort_order on create, as before", () => {
    expect(pathwayGroupWrite({ name: "A", latitude: 0, longitude: 0 }, "create")).toEqual({
      row: { name: "A", latitude: 0, longitude: 0, running: false, sort_order: 0 },
    });
  });

  it("writes only the keys an update sends", () => {
    expect(pathwayGroupWrite({ id: 3, running: false }, "update")).toEqual({ row: { running: false } });
  });

  it("needs a name and coordinates on create", () => {
    expect(pathwayGroupWrite({ latitude: 0, longitude: 0 }, "create")).toEqual({ error: "name is required" });
    expect(pathwayGroupWrite({ name: "A", longitude: 0 }, "create")).toEqual({
      error: "latitude must be a number between -90 and 90",
    });
  });

  it("refuses coordinates out of range and non-text fields", () => {
    expect(pathwayGroupWrite({ latitude: 91 }, "update")).toEqual({ error: "latitude must be a number between -90 and 90" });
    expect(pathwayGroupWrite({ longitude: "144" }, "update")).toEqual({
      error: "longitude must be a number between -180 and 180",
    });
    expect(pathwayGroupWrite({ phone: 12 }, "update")).toEqual({ error: "phone must be text" });
    expect(pathwayGroupWrite({ name: "" }, "update")).toEqual({ error: "name is required" });
  });

  it("refuses a body that is not an object", () => {
    expect(pathwayGroupWrite(null, "create")).toEqual({ error: "Body must be an object" });
  });
});

describe("intersectionEventWrite", () => {
  it("picks the key and the four editable columns", () => {
    expect(
      intersectionEventWrite({
        key: "prayerAndPraise",
        title: "Prayer & Praise",
        description: "d",
        location: "l",
        time: "7pm",
        sort_order: 9,
      })
    ).toEqual({ key: "prayerAndPraise", row: { title: "Prayer & Praise", description: "d", location: "l", time: "7pm" } });
  });

  it("needs a key and a non-empty title when one is sent", () => {
    expect(intersectionEventWrite({ title: "x" })).toEqual({ error: "key required" });
    expect(intersectionEventWrite({ key: "k", title: "" })).toEqual({ error: "title is required" });
  });
});

describe("intersectionDateWrite", () => {
  it("defaults the time to 19:00", () => {
    expect(intersectionDateWrite({ event_key: "k", event_date: "2026-10-07" })).toEqual({
      row: { event_key: "k", event_date: "2026-10-07", event_time: "19:00" },
    });
  });

  it("refuses a missing key, a bad date or a bad time", () => {
    expect(intersectionDateWrite({ event_date: "2026-10-07" })).toEqual({ error: "event_key and event_date required" });
    expect(intersectionDateWrite({ event_key: "k", event_date: "2026-02-30" })).toEqual({
      error: "event_date must be a date (YYYY-MM-DD)",
    });
    expect(intersectionDateWrite({ event_key: "k", event_date: "2026-10-07", event_time: "7pm" })).toEqual({
      error: "event_time must be HH:MM",
    });
  });
});

describe("siteStatWrite", () => {
  it("keeps key, value and label", () => {
    expect(siteStatWrite({ key: "communities", value: 12, label: "Communities", x: 1 })).toEqual({
      row: { key: "communities", value: 12, label: "Communities" },
    });
  });

  it("needs a key and a whole number that is not negative", () => {
    expect(siteStatWrite({ value: 1 })).toEqual({ error: "key and value required" });
    expect(siteStatWrite({ key: "k", value: "1" })).toEqual({ error: "key and value required" });
    expect(siteStatWrite({ key: "k", value: -1 })).toEqual({ error: "value must be a whole number, 0 or more" });
    expect(siteStatWrite({ key: "k", value: 1.5 })).toEqual({ error: "value must be a whole number, 0 or more" });
  });
});

describe("leader writes", () => {
  it("create lower-cases the email and defaults full_access to false", () => {
    expect(leaderCreateWrite({ email: " Ann@Example.com ", name: "Ann", role: "admin" })).toEqual({
      row: { email: "ann@example.com", name: "Ann", full_access: false },
    });
  });

  it("create keeps a given id and full_access", () => {
    expect(leaderCreateWrite({ id: "abc", email: "a@b.co", name: "A", full_access: true })).toEqual({
      row: { id: "abc", email: "a@b.co", name: "A", full_access: true },
    });
  });

  it("create needs an email and a name", () => {
    expect(leaderCreateWrite({ email: "a@b.co" })).toEqual({ error: "email and name required" });
    expect(leaderCreateWrite({ email: "not-an-email", name: "A" })).toEqual({ error: "email must be an email address" });
  });

  it("access update needs an email and a boolean", () => {
    expect(leaderAccessWrite({ email: "A@B.co", full_access: true })).toEqual({ email: "a@b.co", full_access: true });
    expect(leaderAccessWrite({ email: "a@b.co", full_access: "yes" })).toEqual({
      error: "email and full_access (boolean) required",
    });
  });
});

describe("submissionArchiveWrite", () => {
  it("reads a uuid id and a boolean archived", () => {
    expect(submissionArchiveWrite({ id: UUID, archived: 1 })).toEqual({ id: UUID, archived: true });
    expect(submissionArchiveWrite({ id: "7" })).toEqual({ error: "id must be a uuid" });
  });
});
