import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase } from "@/test/fakeSupabase";
import { MISSING_TABLES_MESSAGE } from "./prefs";
import { loadSnapshot } from "./loadSnapshot";

const asClient = (db: unknown) => db as SupabaseClient;

describe("loadSnapshot", () => {
  it("reads the nine tables into a snapshot with the Foundations module ids", async () => {
    const fake = fakeSupabase({ leaders: { data: [{ email: "ann@example.invalid", name: "Ann", full_access: true }] } });
    const now = new Date("2026-10-04T20:00:00Z");
    const snap = await loadSnapshot(asClient(fake.db), now);
    expect(snap.now).toBe(now);
    expect(snap.leaders).toHaveLength(1);
    expect(snap.foundationsModuleIds).toContain("p1m0");
    expect(fake.tables().sort()).toEqual([
      "leader_checkins",
      "leader_email_prefs",
      "leader_people",
      "leader_profiles",
      "leader_training_progress",
      "leader_worksheets",
      "leaders",
      "network_people",
      "study_guides",
    ]);
  });

  it("reads the typed study guide date and the linked pathway group, not the legacy text columns", async () => {
    const fake = fakeSupabase();
    await loadSnapshot(asClient(fake.db), new Date("2026-10-04T20:00:00Z"));
    const selected = (table: string) => fake.calls.find((c) => c[0] === table && c[1] === "select")?.[2];
    expect(selected("study_guides")).toBe("id, guide_on, series, topic, scripture, pdf_url");
    expect(selected("leader_profiles")).toBe("email, display_name, pathway_groups(name)");
  });

  it("fails loud with the migration hint when the email tables are missing", async () => {
    const fake = fakeSupabase({
      leader_email_prefs: { error: { message: "Could not find the table 'public.leader_email_prefs' in the schema cache" } },
    });
    await expect(loadSnapshot(asClient(fake.db), new Date())).rejects.toThrow(MISSING_TABLES_MESSAGE);
  });
});
