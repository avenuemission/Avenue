import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase, type FakeResult } from "@/test/fakeSupabase";
import { ROW_CAP } from "@/lib/adminRead";
import { MISSING_TABLES_MESSAGE, PREFS_COLUMNS } from "./prefs";
import { createEngineDb } from "./engineDb";

const A = "ann@example.invalid";
const B = "bob@example.invalid";
const setup = (results: Record<string, FakeResult> = {}) => {
  const fake = fakeSupabase(results);
  return { fake, engineDb: createEngineDb(fake.db as unknown as SupabaseClient) };
};

describe("createEngineDb", () => {
  it("claim inserts one log row and says yes", async () => {
    const { fake, engineDb } = setup();
    expect(await engineDb.claim(A, "digest", "2026-10-05", "sent")).toBe(true);
    expect(fake.calls).toEqual([
      ["leader_email_log", "from"],
      ["leader_email_log", "insert", { email: A, kind: "digest", period_key: "2026-10-05", status: "sent" }],
    ]);
  });

  it("claim says no when the unique constraint already has the row", async () => {
    const { engineDb } = setup({ "leader_email_log.insert": { error: { message: "duplicate key value", code: "23505" } } });
    expect(await engineDb.claim(A, "digest", "2026-10-05", "sent")).toBe(false);
  });

  it("claim fails loud with the migration hint when the table is missing", async () => {
    const { engineDb } = setup({
      "leader_email_log.insert": {
        error: { message: "Could not find the table 'public.leader_email_log' in the schema cache", code: "PGRST205" },
      },
    });
    await expect(engineDb.claim(A, "digest", "2026-10-05", "sent")).rejects.toThrow(MISSING_TABLES_MESSAGE);
  });

  it("loggedKeys reads one kind's rows for one period in a single query", async () => {
    const { fake, engineDb } = setup({ leader_email_log: { data: [{ email: A, period_key: "2026-10-05" }] } });
    expect(await engineDb.loggedKeys("digest", "2026-10-05")).toEqual(new Set([`${A}|2026-10-05`]));
    expect(fake.calls).toEqual([
      ["leader_email_log", "from"],
      ["leader_email_log", "select", "email, period_key"],
      ["leader_email_log", "eq", "kind", "digest"],
      ["leader_email_log", "eq", "period_key", "2026-10-05"],
    ]);
  });

  it("loggedKeys reads every milestones row, and fails loud at the row cap", async () => {
    const some = setup({
      leader_email_log: { data: [{ email: A, period_key: "baseline" }, { email: B, period_key: "phase1-walked" }] },
    });
    expect(await some.engineDb.loggedKeys("milestones", null)).toEqual(new Set([`${A}|baseline`, `${B}|phase1-walked`]));
    expect(some.fake.calls.filter((c) => c[1] === "eq")).toEqual([["leader_email_log", "eq", "kind", "milestones"]]);
    const data = Array.from({ length: ROW_CAP }, (_, i) => ({ email: `l${i}@example.invalid`, period_key: "baseline" }));
    const full = setup({ leader_email_log: { data } });
    await expect(full.engineDb.loggedKeys("milestones", null)).rejects.toThrow("row read cap");
  });

  it("ensurePrefs adds missing rows without touching existing ones, then returns every row", async () => {
    const row = { email: A, rpms: true, digest: false, church_health: true, apprentice: true, milestones: true, unsubscribe_token: "t" };
    const { fake, engineDb } = setup({ "leader_email_prefs.select": { data: [row] } });
    expect(await engineDb.ensurePrefs([A, B])).toEqual([row]);
    expect(fake.calls).toContainEqual([
      "leader_email_prefs",
      "upsert",
      [{ email: A }, { email: B }],
      { onConflict: "email", ignoreDuplicates: true },
    ]);
    expect(fake.calls).toContainEqual(["leader_email_prefs", "select", PREFS_COLUMNS]);
  });

  it("release deletes only that sent claim", async () => {
    const { fake, engineDb } = setup();
    await engineDb.release(A, "digest", "2026-10-05");
    expect(fake.calls).toEqual([
      ["leader_email_log", "from"],
      ["leader_email_log", "delete"],
      ["leader_email_log", "eq", "email", A],
      ["leader_email_log", "eq", "kind", "digest"],
      ["leader_email_log", "eq", "period_key", "2026-10-05"],
      ["leader_email_log", "eq", "status", "sent"],
    ]);
  });
});
