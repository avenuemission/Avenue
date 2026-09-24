// Not guarded with server-only: the Netlify scheduled function imports this in plain Node. The ESLint boundary rule keeps it out of client code.
// The engine's database, on Supabase (service role). Every error names the
// table and, while migration 009 is not applied, says so.
import type { SupabaseClient } from "@supabase/supabase-js";
import { readRows, ROW_CAP } from "@/lib/server/adminRead";
import type { EngineDb } from "./engine";
import { emailTablesError, PREFS_COLUMNS, type PrefsRow } from "./prefs";

const UNIQUE_VIOLATION = "23505";

export function createEngineDb(db: SupabaseClient): EngineDb {
  const fail = (table: string, message: string) => new Error(`${table}: ${emailTablesError(message)}`);
  return {
    async ensurePrefs(emails) {
      if (emails.length > 0) {
        const { error } = await db
          .from("leader_email_prefs")
          .upsert(
            emails.map((email) => ({ email })),
            { onConflict: "email", ignoreDuplicates: true }
          );
        if (error) throw fail("leader_email_prefs", error.message);
      }
      try {
        return await readRows<PrefsRow>(db, "leader_email_prefs", PREFS_COLUMNS);
      } catch (e) {
        throw new Error(emailTablesError((e as Error).message));
      }
    },
    async loggedKeys(kind, periodKey) {
      let query = db.from("leader_email_log").select("email, period_key").eq("kind", kind);
      if (periodKey !== null) query = query.eq("period_key", periodKey);
      const { data, error } = await query;
      if (error) throw fail("leader_email_log", error.message);
      const rows = (data ?? []) as { email: string; period_key: string }[];
      if (rows.length >= ROW_CAP) {
        throw new Error(
          `leader_email_log: ${rows.length} ${kind} rows reached the ${ROW_CAP} row read cap. Paginate this read before sending.`
        );
      }
      return new Set(rows.map((r) => `${r.email}|${r.period_key}`));
    },
    async claim(email, kind, periodKey, status) {
      const { error } = await db.from("leader_email_log").insert({ email, kind, period_key: periodKey, status });
      if (!error) return true;
      if (error.code === UNIQUE_VIOLATION) return false;
      throw fail("leader_email_log", error.message);
    },
    async release(email, kind, periodKey) {
      const { error } = await db
        .from("leader_email_log")
        .delete()
        .eq("email", email)
        .eq("kind", kind)
        .eq("period_key", periodKey)
        .eq("status", "sent");
      if (error) throw fail("leader_email_log", error.message);
    },
  };
}
