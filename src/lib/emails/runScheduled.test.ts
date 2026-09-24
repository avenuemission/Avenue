import { afterEach, describe, expect, it, vi } from "vitest";
import { SendOutcomeUnknownError } from "./engine";
import { isDryRun, runScheduled, SEND_TIMEOUT_MS, withTimeout } from "./runScheduled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runScheduled", () => {
  it("stays in dry run unless LEADER_EMAILS_DRY_RUN is exactly false", () => {
    expect(isDryRun({})).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "FALSE" })).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "0" })).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "true" })).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "false" })).toBe(false);
  });

  it("gives each send 8 s, then fails it as outcome unknown", async () => {
    vi.useFakeTimers();
    try {
      expect(SEND_TIMEOUT_MS).toBe(8000);
      const never = withTimeout(new Promise<void>(() => {}), SEND_TIMEOUT_MS, "send to x@example.invalid");
      const settled = expect(never).rejects.toBeInstanceOf(SendOutcomeUnknownError);
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS);
      await settled;
      await expect(withTimeout(Promise.resolve("ok"), SEND_TIMEOUT_MS, "fast")).resolves.toBe("ok");
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails loud without Supabase credentials", async () => {
    await expect(runScheduled(new Date(), {})).rejects.toThrow("SUPABASE_SERVICE_ROLE_KEY must be set");
  });

  it("refuses a live run without Gmail credentials", async () => {
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    await expect(
      runScheduled(new Date(), {
        LEADER_EMAILS_DRY_RUN: "false",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      })
    ).rejects.toThrow("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  });
});
