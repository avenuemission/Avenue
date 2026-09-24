import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase } from "@/test/fakeSupabase";
import { readRows, ROW_CAP } from "./adminRead";

const asClient = (db: unknown) => db as SupabaseClient;

describe("readRows", () => {
  it("returns every row of the table with the columns asked for", async () => {
    const fake = fakeSupabase({ leaders: { data: [{ email: "a@example.invalid" }] } });
    const rows = await readRows<{ email: string }>(asClient(fake.db), "leaders", "email");
    expect(rows).toEqual([{ email: "a@example.invalid" }]);
    expect(fake.calls).toEqual([
      ["leaders", "from"],
      ["leaders", "select", "email"],
    ]);
  });

  it("throws with the table name and the database message", async () => {
    const fake = fakeSupabase({ leaders: { error: { message: "permission denied" } } });
    await expect(readRows(asClient(fake.db), "leaders", "email")).rejects.toThrow("leaders: permission denied");
  });

  it("throws rather than undercount when the row cap is reached", async () => {
    const data = Array.from({ length: ROW_CAP }, (_, i) => ({ id: i }));
    const fake = fakeSupabase({ leader_checkins: { data } });
    await expect(readRows(asClient(fake.db), "leader_checkins", "id")).rejects.toThrow("row read cap");
  });
});
