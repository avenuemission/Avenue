// Not guarded with server-only: the Netlify scheduled function imports this in plain Node. The ESLint boundary rule keeps it out of client code.
import type { SupabaseClient } from "@supabase/supabase-js";

// A whole-table read for admin views and the email engine. Supabase returns
// at most 1000 rows per select by default, so a read that reaches that cap
// would undercount silently: it throws instead. Errors carry the table name.
export const ROW_CAP = 1000;

export async function readRows<T>(db: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const { data, error } = await db.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  const rows = (data ?? []) as unknown as T[];
  if (rows.length >= ROW_CAP) {
    throw new Error(
      `${table}: ${rows.length} rows reached the ${ROW_CAP} row read cap. Paginate this read before trusting the numbers.`
    );
  }
  return rows;
}
