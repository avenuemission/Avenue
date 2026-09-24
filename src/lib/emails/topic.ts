// This week's Pathways topic for the Monday digest (spec 3.2). Pure.
// study_guides.guide_date is free text written as DD/MM/YYYY. A row whose
// date cannot be read is skipped and reported, never guessed at.
import { addDaysISO } from "@/lib/melbourneDate";

export interface GuideRow {
  id: string;
  guide_date: string | null;
  series: string | null;
  topic: string | null;
  scripture: string | null;
  pdf_url: string | null;
}

export interface WeekTopic {
  guide: GuideRow;
  date: string;
  thisWeek: boolean;
}

export function parseGuideDate(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The guide dated within Monday to Sunday of this week (the earliest if
// several), else the most recent past one, else null.
export function topicForWeek(guides: GuideRow[], mondayISO: string): { topic: WeekTopic | null; unparseable: string[] } {
  const sunday = addDaysISO(mondayISO, 6);
  const dated: { guide: GuideRow; date: string }[] = [];
  const unparseable: string[] = [];
  for (const guide of guides) {
    const date = parseGuideDate(guide.guide_date);
    if (date) dated.push({ guide, date });
    else unparseable.push(`${guide.id} (${JSON.stringify(guide.guide_date)})`);
  }
  const inWeek = dated.filter((d) => d.date >= mondayISO && d.date <= sunday).sort((a, b) => a.date.localeCompare(b.date));
  if (inWeek.length > 0) return { topic: { ...inWeek[0], thisWeek: true }, unparseable };
  const past = dated.filter((d) => d.date < mondayISO).sort((a, b) => b.date.localeCompare(a.date));
  return { topic: past.length > 0 ? { ...past[0], thisWeek: false } : null, unparseable };
}
