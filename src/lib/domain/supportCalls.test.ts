import { describe, expect, it } from "vitest";
import { upcomingCallSlots } from "./supportCalls";

function inZone<T>(tz: string, run: () => T): T {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

describe("upcomingCallSlots", () => {
  // Thursday 24 Sep 2026, 7 pm AEST: this Thursday's 6 pm call has passed.
  const now = new Date("2026-09-24T09:00:00Z");
  const expected = {
    // Thursdays 6 pm Melbourne: 1 Oct is AEST, from 4 Oct daylight saving
    // (AEDT). The window is today plus 20 days (to 14 Oct, as before), so
    // with today's call already past only two Thursdays fit.
    thursdays: ["2026-10-01T08:00:00.000Z", "2026-10-08T07:00:00.000Z"],
    // Saturdays 2 pm Melbourne.
    saturdays: ["2026-09-26T04:00:00.000Z", "2026-10-03T04:00:00.000Z", "2026-10-10T03:00:00.000Z"],
  };

  it("gives the next three Thursday 6 pm and Saturday 2 pm calls, in Melbourne time", () => {
    const slots = upcomingCallSlots(now);
    expect({ thursdays: iso(slots.thursdays), saturdays: iso(slots.saturdays) }).toEqual(expected);
  });

  it("gives the same instants for a browser outside Melbourne", () => {
    for (const tz of ["America/New_York", "UTC", "Asia/Kolkata"]) {
      const slots = inZone(tz, () => upcomingCallSlots(now));
      expect({ thursdays: iso(slots.thursdays), saturdays: iso(slots.saturdays) }).toEqual(expected);
    }
  });

  it("includes today's call while it is still ahead", () => {
    // Thursday 24 Sep 2026, 5 pm AEST.
    const slots = upcomingCallSlots(new Date("2026-09-24T07:00:00Z"));
    expect(slots.thursdays[0].toISOString()).toBe("2026-09-24T08:00:00.000Z");
  });
});
