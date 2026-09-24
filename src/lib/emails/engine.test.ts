import { describe, expect, it, vi } from "vitest";
import type { Snapshot } from "./compose";
import { MISSING_TABLES_MESSAGE, type PrefsRow } from "./prefs";
import { runLeaderEmails, type EngineDeps } from "./engine";
import { SEND_TIMEOUT_MS, withTimeout } from "./runScheduled";

const ANN = "ann@example.invalid";
const DAN = "dan@example.invalid";
const BOB = "bob@example.invalid";
const CAT = "cat@example.invalid";
const STRANGER = "stranger@example.invalid";

// Monday 5 October 2026, 07:00 in Melbourne: digest and milestones are due.
const MONDAY_7AM = new Date("2026-10-04T20:00:00Z");
const WEEK = "2026-10-05";

const prefs = (email: string, token: string, over: Partial<PrefsRow> = {}): PrefsRow => ({
  email,
  rpms: true,
  digest: true,
  church_health: true,
  apprentice: true,
  milestones: true,
  unsubscribe_token: token,
  ...over,
});

const PREFS: PrefsRow[] = [
  prefs(ANN, "11111111-1111-4111-8111-111111111111"),
  prefs(DAN, "22222222-2222-4222-8222-222222222222"),
  prefs(BOB, "33333333-3333-4333-8333-333333333333", { digest: false }),
  // A preferences row alone never makes anyone a recipient.
  prefs(STRANGER, "44444444-4444-4444-8444-444444444444"),
];

function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    now: MONDAY_7AM,
    leaders: [
      { email: ANN, name: "Ann", full_access: true },
      { email: DAN, name: "Dan", full_access: true },
      { email: BOB, name: "Bob", full_access: true },
      { email: CAT, name: "Cat", full_access: false },
    ],
    prefs: PREFS,
    profiles: [],
    checkins: [],
    people: [],
    network: [],
    training: [],
    worksheets: [],
    guides: [],
    foundationsModuleIds: ["p1m0"],
    ...over,
  };
}

// Everyone already has a milestone baseline unless a test says otherwise.
const BASELINES = [ANN, DAN, BOB].map((email) => `milestones|${email}|baseline`);

function harness(opts: { snapshot?: Snapshot; logged?: string[]; deps?: Partial<EngineDeps> } = {}) {
  const events: string[] = [];
  const logged = new Set(opts.logged ?? BASELINES);
  const deps: EngineDeps = {
    now: MONDAY_7AM,
    dryRun: false,
    maxSends: 20,
    delayMs: 1000,
    budgetMs: 20_000,
    clock: () => 0,
    loadSnapshot: vi.fn(async () => opts.snapshot ?? snapshot()),
    ensurePrefs: vi.fn(async (emails: string[]) => {
      events.push(`ensurePrefs ${emails.join(",")}`);
      return PREFS;
    }),
    // "<email>|<period_key>" for one kind (one period, or all when null).
    loggedKeys: vi.fn(async (kind: string, key: string | null) => {
      const keys = [...logged]
        .filter((id) => id.startsWith(`${kind}|`) && (key === null || id.endsWith(`|${key}`)))
        .map((id) => id.slice(kind.length + 1));
      return new Set(keys);
    }),
    claim: vi.fn(async (email: string, kind: string, key: string, status: string) => {
      events.push(`claim ${status} ${kind} ${email} ${key}`);
      const id = `${kind}|${email}|${key}`;
      if (logged.has(id)) return false;
      logged.add(id);
      return true;
    }),
    release: vi.fn(async (email: string, kind: string, key: string) => {
      events.push(`release ${kind} ${email} ${key}`);
      logged.delete(`${kind}|${email}|${key}`);
    }),
    send: vi.fn(async (to: string, message: { subject: string }) => {
      events.push(`send ${to} ${message.subject}`);
    }),
    sleep: vi.fn(async (ms: number) => {
      events.push(`sleep ${ms}`);
    }),
    log: vi.fn(),
    ...opts.deps,
  };
  return { deps, events, logged };
}

describe("runLeaderEmails", () => {
  it("loads nothing and sends nothing when no kind is due", async () => {
    // Thursday 24 September 2026, 04:00 in Melbourne.
    const { deps } = harness({ deps: { now: new Date("2026-09-23T18:00:00Z") } });
    const report = await runLeaderEmails(deps);
    expect(report.due).toEqual([]);
    expect(deps.loadSnapshot).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("in dry run reports who would get what, and sends and writes nothing", async () => {
    const { deps } = harness({ deps: { dryRun: true } });
    const report = await runLeaderEmails(deps);
    expect(report.dryRun).toBe(true);
    expect(report.due).toEqual(["digest", "milestones"]);
    expect(report.wouldSend).toEqual([`digest ${ANN} ${WEEK}`, `digest ${DAN} ${WEEK}`]);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.release).not.toHaveBeenCalled();
    expect(deps.ensurePrefs).not.toHaveBeenCalled();
  });

  it("live: claims before sending, to full-access leaders who did not opt out, pausing between sends", async () => {
    const { deps, events } = harness();
    const report = await runLeaderEmails(deps);
    // The pause comes before the claim, so a run stopped mid-pause leaves
    // no claimed-but-unsent row behind.
    expect(events).toEqual([
      `ensurePrefs ${ANN},${BOB},${DAN}`,
      `claim sent digest ${ANN} ${WEEK}`,
      `send ${ANN} Your week ahead`,
      "sleep 1000",
      `claim sent digest ${DAN} ${WEEK}`,
      `send ${DAN} Your week ahead`,
    ]);
    expect(report.sent).toEqual([`digest ${ANN} ${WEEK}`, `digest ${DAN} ${WEEK}`]);
    const sentTo = vi.mocked(deps.send).mock.calls.map((c) => c[0]);
    expect(sentTo).not.toContain(BOB);
    expect(sentTo).not.toContain(CAT);
    expect(sentTo).not.toContain(STRANGER);
  });

  it("skips anything another run already claimed, from one log read per kind", async () => {
    const { deps } = harness({ logged: [...BASELINES, `digest|${ANN}|${WEEK}`] });
    const report = await runLeaderEmails(deps);
    expect(report.skipped).toEqual([`digest ${ANN} ${WEEK}`]);
    expect(report.sent).toEqual([`digest ${DAN} ${WEEK}`]);
    expect(vi.mocked(deps.loggedKeys).mock.calls).toEqual([
      ["digest", WEEK],
      ["milestones", null],
    ]);
    expect(vi.mocked(deps.claim).mock.calls.map((c) => c[0])).toEqual([DAN]);
  });

  it("releases and reports a failed send, and carries on with the next leader", async () => {
    const { deps, events, logged } = harness({
      deps: {
        send: vi.fn(async (to: string) => {
          if (to === ANN) throw new Error("SMTP down");
          events.push(`send ${to}`);
        }),
      },
    });
    const report = await runLeaderEmails(deps);
    expect(report.failed).toEqual([`digest ${ANN} ${WEEK}: SMTP down`]);
    expect(events).toContain(`release digest ${ANN} ${WEEK}`);
    expect(logged.has(`digest|${ANN}|${WEEK}`)).toBe(false);
    expect(report.sent).toEqual([`digest ${DAN} ${WEEK}`]);
  });

  it("a send that never finishes times out loud and keeps its claim, so it is never sent twice", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { deps, events, logged } = harness({
        deps: {
          send: vi.fn((to: string) => {
            // Ann's send hangs forever, as a stuck SMTP socket would.
            const work = to === ANN ? new Promise<void>(() => {}) : Promise.resolve(void events.push(`send ${to}`));
            return withTimeout(work, SEND_TIMEOUT_MS, `send to ${to}`);
          }),
        },
      });
      const running = runLeaderEmails(deps);
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS);
      const report = await running;
      expect(report.failed).toEqual([
        `digest ${ANN} ${WEEK}: send to ${ANN} timed out after 8000 ms: outcome unknown, not retried`,
      ]);
      expect(deps.release).not.toHaveBeenCalled();
      expect(logged.has(`digest|${ANN}|${WEEK}`)).toBe(true);
      expect(report.sent).toEqual([`digest ${DAN} ${WEEK}`]);
      expect(events).toContain(`send ${DAN}`);
      expect(String(spy.mock.calls[0][0])).toContain("SEND OUTCOME UNKNOWN");
    } finally {
      spy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("live: refuses a recipient with no real unsubscribe token, and claims and sends nothing for them", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const noToken = PREFS.map((p) => (p.email === ANN ? { ...p, unsubscribe_token: null as unknown as string } : p));
    const badToken = PREFS.map((p) => (p.email === ANN ? { ...p, unsubscribe_token: "not-a-uuid" } : p));
    for (const rows of [noToken, badToken]) {
      const { deps } = harness({ deps: { ensurePrefs: vi.fn(async () => rows) } });
      const report = await runLeaderEmails(deps);
      expect(report.failed).toEqual([`digest ${ANN}: refusing digest to ${ANN}: no unsubscribe token`]);
      expect(vi.mocked(deps.claim).mock.calls.map((c) => c[0])).toEqual([DAN]);
      expect(vi.mocked(deps.send).mock.calls.map((c) => c[0])).toEqual([DAN]);
    }
    spy.mockRestore();
  });

  it("dry run does not need a token: it only reports", async () => {
    const rows = PREFS.filter((p) => p.email !== ANN);
    const { deps } = harness({ deps: { dryRun: true }, snapshot: snapshot({ prefs: rows }) });
    const report = await runLeaderEmails(deps);
    expect(report.wouldSend).toContain(`digest ${ANN} ${WEEK}`);
    expect(report.failed).toEqual([]);
  });

  it("caps sends per run and leaves the rest for the next hour", async () => {
    const { deps } = harness({ deps: { maxSends: 1 } });
    const report = await runLeaderEmails(deps);
    expect(report.sent).toEqual([`digest ${ANN} ${WEEK}`]);
    expect(report.deferred).toEqual([`digest ${DAN} ${WEEK}`]);
    expect(deps.claim).toHaveBeenCalledTimes(1);
  });

  it("stops claiming once the time budget is spent, leaving the rest for the next hour", async () => {
    let t = 0;
    const { deps } = harness({
      deps: {
        clock: () => t,
        send: vi.fn(async () => {
          t += 25_000;
        }),
      },
    });
    const report = await runLeaderEmails(deps);
    expect(report.sent).toEqual([`digest ${ANN} ${WEEK}`]);
    expect(report.deferred).toEqual([`digest ${DAN} ${WEEK}`]);
    expect(deps.claim).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it("refuses an address that could reach more than one inbox, and writes nothing for it", async () => {
    const TWO = "ann@example.invalid,eve@example.invalid";
    const { deps } = harness({ snapshot: snapshot({ leaders: [{ email: TWO, name: "Two", full_access: true }] }) });
    const report = await runLeaderEmails(deps);
    expect(report.failed).toEqual([
      `digest ${TWO}: refusing digest to ${TWO}: not one plain full-access address`,
      `milestones ${TWO}: refusing milestones to ${TWO}: not one plain full-access address`,
    ]);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.ensurePrefs).toHaveBeenCalledWith([]);
  });

  it("on a leader's first live run, baselines milestones they already had and sends none of them", async () => {
    const { deps, events } = harness({
      snapshot: snapshot({ training: [{ email: ANN, completed_modules: ["p1m0"] }] }),
      logged: [`milestones|${DAN}|baseline`, `milestones|${BOB}|baseline`],
    });
    const report = await runLeaderEmails(deps);
    expect(events).toContain(`claim baseline milestones ${ANN} phase1-walked`);
    expect(events).toContain(`claim baseline milestones ${ANN} baseline`);
    expect(events.some((e) => e.includes("You walked Foundations"))).toBe(false);
    expect(report.baselined).toEqual([`milestones ${ANN} phase1-walked`]);
  });

  it("sends a new milestone once, and a second run sends nothing again", async () => {
    const { deps, events } = harness({ snapshot: snapshot({ training: [{ email: ANN, completed_modules: ["p1m0"] }] }) });
    const first = await runLeaderEmails(deps);
    expect(first.sent).toContain(`milestones ${ANN} phase1-walked`);
    const second = await runLeaderEmails(deps);
    expect(second.sent).toEqual([]);
    expect(second.skipped).toContain(`milestones ${ANN} phase1-walked`);
    expect(events.filter((e) => e === `send ${ANN} You walked Foundations`)).toHaveLength(1);
  });

  it("fails loud when the email tables are missing", async () => {
    const { deps } = harness({
      deps: {
        loadSnapshot: vi.fn(async () => {
          throw new Error(MISSING_TABLES_MESSAGE);
        }),
      },
    });
    await expect(runLeaderEmails(deps)).rejects.toThrow("Leader email tables are missing");
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("reports study guides whose date cannot be read", async () => {
    const guides = [{ id: "g1", guide_on: "Week 3", series: null, topic: "Joy", scripture: null, pdf_url: null }];
    const { deps } = harness({ snapshot: snapshot({ guides }), deps: { dryRun: true } });
    const report = await runLeaderEmails(deps);
    expect(report.unparseableGuides).toEqual(['g1 ("Week 3")']);
  });
});
