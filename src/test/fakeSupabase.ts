// A stand-in for the Supabase query builder, for route and adapter tests.
// Every call is recorded as [table, method, ...args]. Awaiting a chain
// resolves with the result registered for "table.operation.single" when the
// chain ended in maybeSingle()/single(), else "table.operation" (select,
// insert, upsert, update or delete), else "table", else an empty result:
// [] for a list select, null otherwise.

export interface FakeError {
  message: string;
  code?: string;
}

export interface FakeResult {
  data?: unknown;
  error?: FakeError | null;
}

export type FakeCall = [string, string, ...unknown[]];

// A result can also be worked out from the chain's own calls (without the
// table name), e.g. to answer two maybeSingle() lookups on one table
// differently by their .eq() filter.
export type FakeResultFn = (chainCalls: [string, ...unknown[]][]) => FakeResult;

interface FakeResponse {
  data: unknown;
  error: FakeError | null;
}

export function fakeSupabase(results: Record<string, FakeResult | FakeResultFn> = {}) {
  const calls: FakeCall[] = [];

  function chainFor(table: string) {
    let operation = "select";
    let single = false;
    const chainCalls: [string, ...unknown[]][] = [];
    const record = (method: string, args: unknown[]) => {
      calls.push([table, method, ...args]);
      chainCalls.push([method, ...args]);
    };
    const chain = {
      select(...args: unknown[]) {
        record("select", args);
        return chain;
      },
      insert(...args: unknown[]) {
        operation = "insert";
        record("insert", args);
        return chain;
      },
      upsert(...args: unknown[]) {
        operation = "upsert";
        record("upsert", args);
        return chain;
      },
      update(...args: unknown[]) {
        operation = "update";
        record("update", args);
        return chain;
      },
      delete(...args: unknown[]) {
        operation = "delete";
        record("delete", args);
        return chain;
      },
      eq(...args: unknown[]) {
        record("eq", args);
        return chain;
      },
      in(...args: unknown[]) {
        record("in", args);
        return chain;
      },
      order(...args: unknown[]) {
        record("order", args);
        return chain;
      },
      limit(...args: unknown[]) {
        record("limit", args);
        return chain;
      },
      maybeSingle() {
        single = true;
        record("maybeSingle", []);
        return chain;
      },
      single() {
        single = true;
        record("single", []);
        return chain;
      },
      then(onFulfilled: (value: FakeResponse) => unknown, onRejected?: (reason: unknown) => unknown) {
        const found =
          (single ? results[`${table}.${operation}.single`] : undefined) ??
          results[`${table}.${operation}`] ??
          results[table] ??
          {};
        const r: FakeResult = typeof found === "function" ? found(chainCalls) : found;
        const empty = operation === "select" && !single ? [] : null;
        const response: FakeResponse = { data: r.data === undefined ? empty : r.data, error: r.error ?? null };
        return Promise.resolve(response).then(onFulfilled, onRejected);
      },
    };
    return chain;
  }

  const db = {
    from(table: string) {
      calls.push([table, "from"]);
      return chainFor(table);
    },
    // Rate-limit RPCs (rate_limit_hit, rate_limit_blocked) go through here.
    // Register a result under the RPC's own name, e.g. results.rate_limit_blocked.
    // Defaults to { data: false, error: null } so a route under test is never
    // blocked and never trips a rate limit unless a test asks for that.
    rpc(name: string, params: unknown) {
      calls.push([name, "rpc", params]);
      const found = results[name] ?? {};
      const r: FakeResult = typeof found === "function" ? found([["rpc", params]]) : found;
      return Promise.resolve({ data: r.data === undefined ? false : r.data, error: r.error ?? null });
    },
  };

  return { db, calls, tables: () => calls.filter((c) => c[1] === "from").map((c) => c[0]) };
}
