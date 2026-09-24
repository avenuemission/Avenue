import "server-only";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export interface RateRule {
  name: string;
  windowSeconds: number;
  max: number;
}

// The one place every rate-limited surface's window/max lives. Change a
// limit here, not at the call site.
export const RATE: {
  form: RateRule;
  formRecipient: RateRule;
  signup: RateRule;
  openai: RateRule;
  workshopCode: RateRule;
  workshopSubmit: RateRule;
  adminFail: RateRule;
} = {
  form: { name: "form", windowSeconds: 600, max: 5 },
  formRecipient: { name: "form-to", windowSeconds: 3600, max: 3 },
  signup: { name: "signup", windowSeconds: 3600, max: 5 },
  openai: { name: "openai", windowSeconds: 3600, max: 10 },
  workshopCode: { name: "ws-code", windowSeconds: 600, max: 30 },
  workshopSubmit: { name: "ws-submit", windowSeconds: 600, max: 10 },
  adminFail: { name: "admin-fail", windowSeconds: 900, max: 5 },
};

// Swappable so route tests never touch the database. Production code gets
// supabaseRateDeps(); tests pass a fake.
export interface RateDeps {
  hit(key: string, windowSeconds: number, max: number): Promise<boolean>;
  blocked(key: string, windowSeconds: number, max: number): Promise<boolean>;
}

// Backed by the rate_limit_hit / rate_limit_blocked RPCs from
// supabase/migrations/011_rate_limits.sql. Fails loud: an RPC error throws
// rather than silently letting (or blocking) the caller through.
export function supabaseRateDeps(): RateDeps {
  const db = getSupabaseAdmin();
  return {
    async hit(key, windowSeconds, max) {
      const { data, error } = await db.rpc("rate_limit_hit", {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_max: max,
      });
      if (error) throw new Error(`rate_limit_hit: ${error.message}`);
      return Boolean(data);
    },
    async blocked(key, windowSeconds, max) {
      const { data, error } = await db.rpc("rate_limit_blocked", {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_max: max,
      });
      if (error) throw new Error(`rate_limit_blocked: ${error.message}`);
      return Boolean(data);
    },
  };
}

function keyFor(rule: RateRule, id: string): string {
  return `${rule.name}:${id}`;
}

// Counts one hit for `id` under `rule` and reports whether it is still
// within the allowed rate. Call this once per attempt (e.g. once per form
// submission), not on every read.
export async function allow(rule: RateRule, id: string, deps: RateDeps = supabaseRateDeps()): Promise<boolean> {
  return deps.hit(keyFor(rule, id), rule.windowSeconds, rule.max);
}

// True when `id` has already used up its rate under `rule`. Read-only: does
// not itself count as a hit. Use this to gate a request before doing any
// work, without penalising the caller twice for the same attempt.
export async function isBlocked(rule: RateRule, id: string, deps: RateDeps = supabaseRateDeps()): Promise<boolean> {
  return deps.blocked(keyFor(rule, id), rule.windowSeconds, rule.max);
}
