import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fakeSupabase } from "@/test/fakeSupabase";
import { STUDY_GUIDE_COLUMNS } from "@/lib/domain/studyGuides";
import { PATHWAY_GROUP_COLUMNS } from "@/lib/domain/content";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ getSupabaseAdmin: h.getSupabaseAdmin }));

import { getCarouselImages, getIntersectionEvents, getPathwayGroups, getSiteStats, getStudyGuides } from "./content";

const failure = { error: { message: "permission denied for table" } };

beforeEach(() => {
  h.getSupabaseAdmin.mockReset();
});

describe("getSiteStats", () => {
  it("reads every counter with the service role", async () => {
    const stats = [{ key: "communities", value: 6, label: "Pathway Communities" }];
    const fake = fakeSupabase({ site_stats: { data: stats } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    expect(await getSiteStats()).toEqual(stats);
    expect(fake.calls).toEqual([
      ["site_stats", "from"],
      ["site_stats", "select", "key, value, label"],
    ]);
  });

  it("throws on a read error instead of falling back", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ site_stats: failure }).db);
    await expect(getSiteStats()).rejects.toThrow("site_stats: permission denied for table");
  });
});

describe("getPathwayGroups", () => {
  it("reads the map columns (no phone) in sort order and maps each row", async () => {
    const fake = fakeSupabase({
      pathway_groups: { data: [{ id: 2, name: "Heathmont", latitude: -37.8, longitude: 145.2, time: "Sat", coordinator: "R", running: true, description: "d" }] },
    });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    expect(await getPathwayGroups()).toEqual([
      { id: 2, name: "Heathmont", coordinates: [-37.8, 145.2], time: "Sat", coordinator: "R", running: true, description: "d" },
    ]);
    expect(PATHWAY_GROUP_COLUMNS).not.toContain("phone");
    expect(fake.calls).toEqual([
      ["pathway_groups", "from"],
      ["pathway_groups", "select", PATHWAY_GROUP_COLUMNS],
      ["pathway_groups", "order", "sort_order", { ascending: true }],
    ]);
  });

  it("throws on a read error", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ pathway_groups: failure }).db);
    await expect(getPathwayGroups()).rejects.toThrow("pathway_groups: permission denied");
  });
});

describe("getIntersectionEvents", () => {
  it("gives each event its own dates, in date order", async () => {
    const event = { key: "prayerAndPraise", title: "Prayer & Praise", description: "d", location: "l", time: "t", sort_order: 1 };
    const other = { ...event, key: "quarterlySermon", sort_order: 2 };
    const dates = [
      { id: "a", event_key: "prayerAndPraise", event_date: "2026-10-07", event_time: "19:00" },
      { id: "b", event_key: "quarterlySermon", event_date: "2026-10-10", event_time: "15:00" },
      { id: "c", event_key: "prayerAndPraise", event_date: "2026-10-14", event_time: "19:00" },
    ];
    const fake = fakeSupabase({ intersection_events: { data: [event, other] }, intersection_event_dates: { data: dates } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const events = await getIntersectionEvents();
    expect(events.map((e) => [e.key, e.dates.map((d) => d.id)])).toEqual([
      ["prayerAndPraise", ["a", "c"]],
      ["quarterlySermon", ["b"]],
    ]);
    expect(fake.calls).toContainEqual(["intersection_events", "order", "sort_order", { ascending: true }]);
    expect(fake.calls).toContainEqual(["intersection_event_dates", "order", "event_date", { ascending: true }]);
  });

  it("throws when either read fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ intersection_event_dates: failure }).db);
    await expect(getIntersectionEvents()).rejects.toThrow("intersection_event_dates: permission denied");
  });
});

describe("getStudyGuides", () => {
  it("reads the guide columns in sort order", async () => {
    const fake = fakeSupabase({ study_guides: { data: [{ id: "g1", guide_on: "2026-10-07" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    expect(await getStudyGuides()).toEqual([{ id: "g1", guide_on: "2026-10-07" }]);
    expect(fake.calls).toEqual([
      ["study_guides", "from"],
      ["study_guides", "select", STUDY_GUIDE_COLUMNS],
      ["study_guides", "order", "sort_order", { ascending: true }],
    ]);
  });

  it("throws on a read error", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ study_guides: failure }).db);
    await expect(getStudyGuides()).rejects.toThrow("study_guides: permission denied");
  });
});

describe("getCarouselImages", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "carousel-"));
    const dir = path.join(root, "public", "images", "test_carousel");
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ["b.png", "a.JPG", "c.webp", "d.jpeg", "notes.txt", "e.gif"]) fs.writeFileSync(path.join(dir, name), "");
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("lists the folder's png, jpg, jpeg and webp files as public paths, sorted", async () => {
    expect(await getCarouselImages("test_carousel")).toEqual([
      "/images/test_carousel/a.JPG",
      "/images/test_carousel/b.png",
      "/images/test_carousel/c.webp",
      "/images/test_carousel/d.jpeg",
    ]);
  });

  it("throws for a folder that does not exist", async () => {
    await expect(getCarouselImages("missing_carousel")).rejects.toThrow();
  });

  it("refuses a folder name that could leave public/images", async () => {
    await expect(getCarouselImages("../secrets")).rejects.toThrow("Bad carousel folder name");
    await expect(getCarouselImages("")).rejects.toThrow("Bad carousel folder name");
  });
});
