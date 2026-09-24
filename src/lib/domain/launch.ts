// Launch (phase 3) maths for the rhythm tiles and the plan. Pure. Dates are
// YYYY-MM-DD and compared as calendar days in UTC, so daylight saving never
// shifts a count.
import { filled, isIsoDate, WEEKDAYS, type LaunchData, type Weekday } from "@/lib/domain/journey";
import { GAP_TEXT, type GapId } from "@/lib/domain/arena";
import { formatLong } from "@/lib/domain/dates/format";

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// JavaScript's getUTCDay: 0 is Sunday. WEEKDAYS starts at Monday.
function dayNumber(day: Weekday): number {
  return (WEEKDAYS.indexOf(day) + 1) % 7;
}

export function weeksUntil(launchDate: string, today: Date): number | null {
  if (!isIsoDate(launchDate)) return null;
  const days = (utcDay(launchDate) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY_MS;
  return days <= 0 ? 0 : Math.ceil(days / 7);
}

// Weekly gatherings from the launch date (inclusive) to the same date six
// calendar months later (exclusive). The first gathering is the first
// weeklyDay on or after the launch date.
export function gatheringsInFirstSixMonths(launchDate: string, weeklyDay: Weekday): number | null {
  if (!isIsoDate(launchDate)) return null;
  const [y, m, d] = launchDate.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const end = Date.UTC(y, m - 1 + 6, d);
  const totalDays = (end - start) / DAY_MS;
  const offset = (dayNumber(weeklyDay) - new Date(start).getUTCDay() + 7) % 7;
  return offset >= totalDays ? 0 : Math.floor((totalDays - 1 - offset) / 7) + 1;
}

export function formatIsoDate(iso: string): string {
  return isIsoDate(iso) ? formatLong(iso) : iso;
}

export interface PlanAction {
  id: string;
  text: string;
}

const quote = (s: string) => `“${s.trim()}”`;

// The Launch Plan's next actions: each quotes what the leader wrote.
export function buildPlanActions(data: LaunchData): PlanAction[] {
  const out: PlanAction[] = [];
  const when = data.prayer?.when;
  if (filled(when)) out.push({ id: "pray", text: `Pray and fast about the launch: ${quote(when as string)}` });
  const teamPrayer = data.prayer?.teamPrayer;
  if (filled(teamPrayer)) out.push({ id: "team-prayer", text: `Meet with your launch team to pray: ${quote(teamPrayer as string)}` });
  const gather = data.mission?.gather;
  if (filled(gather)) out.push({ id: "gather", text: `Go where your mission group already gathers: ${quote(gather as string)}` });
  const place = data.space?.place;
  if (filled(place)) out.push({ id: "place", text: `Confirm your place: ${quote(place as string)}` });
  const rawCommitments = data.intentional?.commitments;
  const commitments = Array.isArray(rawCommitments) ? rawCommitments : [];
  commitments.forEach((c, i) => {
    if (filled(c)) out.push({ id: `commit-${i}`, text: `Keep your commitment: ${quote(c)}` });
  });
  const need = data.intentional?.needPosition;
  if (filled(need)) out.push({ id: "need", text: `Put yourself in a position of need: ${quote(need as string)}` });
  const launchDate = data.rhythm?.launchDate;
  if (isIsoDate(launchDate)) out.push({ id: "launch-date", text: `Tell friends and family your launch date: ${formatIsoDate(launchDate)}` });
  const tracking = data.invite?.tracking;
  if (filled(tracking)) out.push({ id: "tracking", text: `Set up your birthdays and needs tracker: ${quote(tracking as string)}` });
  const shepherding = data.invite?.shepherding;
  if (filled(shepherding)) out.push({ id: "shepherding", text: `Start your shepherding plan: ${quote(shepherding as string)}` });
  return out;
}

export function gapActions(gaps: GapId[]): PlanAction[] {
  return gaps.map((gap) => ({ id: `gap-${gap}`, text: GAP_TEXT[gap].action }));
}
